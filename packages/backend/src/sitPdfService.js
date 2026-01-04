/**
 * SIT PDF Report Generator
 * Creates a downloadable PDF report for SIT ideation results
 */

import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import { getBaseOutputDir, sanitizeFilenamePart } from './fileOutputService.js'
import { SIT_TOOLS } from './sitPromptTemplates.js'

/**
 * Generate a SIT ideation PDF report
 * @param {object} session - Express session with SIT results
 * @returns {Promise<{ filename: string, filepath: string }>}
 */
export async function writeSitPdfForSession(session) {
  if (!session?.results?.ideation?.sit) {
    const err = new Error('No SIT results found on session')
    err.type = 'PDF_INPUT_ERROR'
    throw err
  }

  const sitResults = session.results.ideation.sit

  if (sitResults.status !== 'completed' && sitResults.status !== 'completed-with-errors') {
    const err = new Error('SIT execution not completed')
    err.type = 'PDF_INPUT_ERROR'
    throw err
  }

  const baseDir = getBaseOutputDir() || path.join(os.tmpdir(), 'validator-analysis')

  try {
    await fsPromises.mkdir(baseDir, { recursive: true })
  } catch (error) {
    const err = new Error('Failed to create report output directory')
    err.type = 'PDF_WRITE_ERROR'
    err.cause = error
    throw err
  }

  const sessionId = sanitizeFilenamePart(session.id || session.sessionId || 'session')
  const filename = `${sessionId}_sit_ideation.pdf`
  const filepath = path.join(baseDir, filename)

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  let stream

  // Visual style tokens (matching SCAMPER PDF)
  const PRIMARY_COLOR = '#8b5cf6' // Purple for SIT phase
  const TITLE_COLOR = '#111827'
  const BODY_TEXT_COLOR = '#374151'
  const MUTED_TEXT_COLOR = '#6b7280'
  const DIVIDER_COLOR = '#e5e7eb'
  const ACCENT_COLOR = '#3b82f6' // Blue accent

  const innerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const contentWidth = Math.min(480, innerWidth)
  const contentX = doc.page.margins.left + (innerWidth - contentWidth) / 2

  try {
    stream = fs.createWriteStream(filepath)
  } catch (error) {
    const err = new Error('Failed to create PDF write stream')
    err.type = 'PDF_WRITE_ERROR'
    err.cause = error
    throw err
  }

  const finishPromise = new Promise((resolve, reject) => {
    const handleError = (error) => {
      const err = new Error('Failed to write SIT PDF report')
      err.type = 'PDF_WRITE_ERROR'
      err.cause = error
      reject(err)
    }

    stream.on('error', handleError)
    doc.on('error', handleError)

    stream.on('finish', async () => {
      // Store report metadata on session
      if (!session.results.ideation.sitReport) {
        session.results.ideation.sitReport = {}
      }
      session.results.ideation.sitReport.filename = filename
      session.results.ideation.sitReport.filepath = filepath
      session.results.ideation.sitReport.generatedAt = new Date().toISOString()

      if (typeof session.save === 'function') {
        await session.save()
      }

      resolve({ filename, filepath })
    })
  })

  doc.pipe(stream)

  // Helper: Add divider line
  function addDivider() {
    const y = doc.y + 10
    doc.strokeColor(DIVIDER_COLOR).lineWidth(1).moveTo(contentX, y).lineTo(contentX + contentWidth, y).stroke()
    doc.y = y + 15
  }

  // Helper: Ensure minimum space or add new page
  function ensureSpace(minSpace = 100) {
    const availableSpace = doc.page.height - doc.page.margins.bottom - doc.y
    if (availableSpace < minSpace) {
      doc.addPage()
    }
  }

  // Helper: Wrap text and return height
  function getTextHeight(text, options = {}) {
    return doc.heightOfString(text, { ...options, width: contentWidth })
  }

  // ============================================
  // COVER PAGE
  // ============================================
  doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(28)
  doc.text('Solution Ideation Report', contentX, 120, { width: contentWidth, align: 'center' })

  doc.fillColor(PRIMARY_COLOR).fontSize(16)
  doc.text('SIT (Systematic Inventive Thinking)', contentX, doc.y + 10, { width: contentWidth, align: 'center' })

  doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(11)
  doc.text(
    'Constraint-driven innovation using five thinking tools: Subtraction, Division, Task Unification, Multiplication, and Attribute Dependency.',
    contentX,
    doc.y + 20,
    { width: contentWidth, align: 'center' }
  )

  doc.y = 450
  doc.fillColor(MUTED_TEXT_COLOR).fontSize(10)
  const date = new Date(sitResults.startedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`Generated on ${date}`, contentX, doc.y, { width: contentWidth, align: 'center' })

  // ============================================
  // PROBLEM CONTEXT
  // ============================================
  doc.addPage()
  doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(18)
  doc.text('Problem Context', contentX, 80)
  doc.moveDown(0.5)
  addDivider()

  const problemDescription = session.inputs?.validationRequest?.description || 'No problem description available'
  doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(11)
  doc.text(problemDescription, contentX, doc.y, { width: contentWidth, align: 'left' })
  doc.moveDown(1)

  // Clarification context
  const clarification = session.inputs?.clarification
  if (clarification && (clarification.location || clarification.targetCustomer || clarification.teamSize)) {
    doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(12)
    doc.text('Additional Context', contentX, doc.y)
    doc.moveDown(0.5)

    doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
    if (clarification.location) {
      doc.text(`Location/Market: ${clarification.location}`, contentX, doc.y)
      doc.moveDown(0.3)
    }
    if (clarification.targetCustomer) {
      doc.text(`Target Customer: ${clarification.targetCustomer}`, contentX, doc.y)
      doc.moveDown(0.3)
    }
    if (clarification.teamSize) {
      doc.text(`Team Size: ${clarification.teamSize}`, contentX, doc.y)
      doc.moveDown(0.3)
    }
    doc.moveDown(1)
  }

  // ============================================
  // SIT OVERVIEW
  // ============================================
  ensureSpace(150)
  doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(14)
  doc.text('About SIT (Systematic Inventive Thinking)', contentX, doc.y)
  doc.moveDown(0.5)

  doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
  doc.text(
    'SIT is a constraint-driven innovation methodology that focuses on incremental improvements ' +
    'within existing resources and limitations. Unlike brainstorming approaches that encourage ' +
    'wild ideas, SIT systematically applies five thinking tools to discover practical, implementable ' +
    'solutions that work with what you already have.',
    contentX,
    doc.y,
    { width: contentWidth, align: 'left' }
  )
  doc.moveDown(1)

  doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(11)
  doc.text('The Five SIT Tools:', contentX, doc.y)
  doc.moveDown(0.5)

  doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
  SIT_TOOLS.forEach(tool => {
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').text(`${tool.name}: `, contentX, doc.y, { continued: true })
    doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(tool.description, { width: contentWidth - 20 })
    doc.moveDown(0.5)
  })

  // ============================================
  // TOOL-BY-TOOL IDEAS
  // ============================================
  SIT_TOOLS.forEach((tool, toolIndex) => {
    const toolData = sitResults.tools[tool.id]

    if (!toolData) {
      return
    }

    doc.addPage()
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(16)
    doc.text(`Tool ${toolIndex + 1}: ${tool.name}`, contentX, 80)
    doc.moveDown(0.3)

    doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
    doc.text(tool.description, contentX, doc.y, { width: contentWidth })
    doc.moveDown(0.5)
    addDivider()

    // Check for errors
    if (toolData.error) {
      doc.fillColor('#dc2626').font('Helvetica-Oblique').fontSize(10)
      doc.text(`Error: ${toolData.error}`, contentX, doc.y, { width: contentWidth })
      doc.moveDown(1)
      return
    }

    // Display ideas
    const ideas = toolData.ideas || []
    if (ideas.length === 0) {
      doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Oblique').fontSize(10)
      doc.text('No ideas generated for this tool.', contentX, doc.y)
      doc.moveDown(1)
      return
    }

    ideas.forEach((idea, index) => {
      ensureSpace(120)

      // Idea number and title
      doc.fillColor(ACCENT_COLOR).font('Helvetica-Bold').fontSize(11)
      doc.text(`${index + 1}. ${idea.title}`, contentX, doc.y, { width: contentWidth })
      doc.moveDown(0.5)

      // Tool-specific fields
      doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)

      if (idea.subtractedElement) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Removed: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.subtractedElement, { width: contentWidth })
        doc.moveDown(0.3)
      }

      if (idea.dividedElement) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Divided: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.dividedElement, { width: contentWidth })
        doc.moveDown(0.3)
        if (idea.divisionType) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Type: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.divisionType, { width: contentWidth })
          doc.moveDown(0.3)
        }
      }

      if (idea.existingComponent) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Component: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.existingComponent, { width: contentWidth })
        doc.moveDown(0.3)
        if (idea.newTask) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('New Task: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.newTask, { width: contentWidth })
          doc.moveDown(0.3)
        }
      }

      if (idea.multipliedElement) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Multiplied: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.multipliedElement, { width: contentWidth })
        doc.moveDown(0.3)
        if (idea.variation) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Variation: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.variation, { width: contentWidth })
          doc.moveDown(0.3)
        }
      }

      if (idea.dependentAttribute) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Dependent: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.dependentAttribute, { width: contentWidth })
        doc.moveDown(0.3)
        if (idea.independentAttribute) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Independent: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.independentAttribute, { width: contentWidth })
          doc.moveDown(0.3)
        }
        if (idea.dependencyRule) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Rule: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.dependencyRule, { width: contentWidth })
          doc.moveDown(0.3)
        }
      }

      // Description
      doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
      doc.text(idea.description, contentX, doc.y, { width: contentWidth })
      doc.moveDown(0.5)

      // Benefits
      if (idea.benefits) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Benefits: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.benefits, { width: contentWidth })
        doc.moveDown(0.5)
      }

      // Rationale
      if (idea.rationale) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Rationale: ', contentX, doc.y, { continued: true })
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(idea.rationale, { width: contentWidth })
        doc.moveDown(0.5)
      }

      // Spacer between ideas
      if (index < ideas.length - 1) {
        doc.moveDown(0.5)
        const y = doc.y
        doc
          .strokeColor('#f3f4f6')
          .lineWidth(0.5)
          .moveTo(contentX, y)
          .lineTo(contentX + contentWidth, y)
          .stroke()
        doc.y = y + 10
      }
    })
  })

  // ============================================
  // SYNTHESIS & TOP CONCEPTS
  // ============================================
  if (sitResults.synthesis && !sitResults.synthesis.error) {
    doc.addPage()
    doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(18)
    doc.text('Synthesis & Top Concepts', contentX, 80)
    doc.moveDown(0.5)
    addDivider()

    const synthesis = sitResults.synthesis

    // Comparative Analysis
    if (synthesis.comparativeAnalysis) {
      doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(14)
      doc.text('Comparative Analysis', contentX, doc.y)
      doc.moveDown(0.5)

      if (synthesis.comparativeAnalysis.mostPromisingTools) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').fontSize(10)
        doc.text('Most Promising Tools:', contentX, doc.y)
        doc.moveDown(0.3)
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica')
        doc.text(synthesis.comparativeAnalysis.mostPromisingTools.join(', '), contentX, doc.y, { width: contentWidth })
        doc.moveDown(0.5)
      }

      if (synthesis.comparativeAnalysis.crossToolPatterns) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').fontSize(10)
        doc.text('Cross-Tool Patterns:', contentX, doc.y)
        doc.moveDown(0.3)
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica')
        doc.text(synthesis.comparativeAnalysis.crossToolPatterns, contentX, doc.y, { width: contentWidth })
        doc.moveDown(0.5)
      }

      if (synthesis.comparativeAnalysis.synergies) {
        doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').fontSize(10)
        doc.text('Synergies:', contentX, doc.y)
        doc.moveDown(0.3)
        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica')
        doc.text(synthesis.comparativeAnalysis.synergies, contentX, doc.y, { width: contentWidth })
        doc.moveDown(1)
      }

      addDivider()
    }

    // Top Concepts
    if (synthesis.topConcepts && Array.isArray(synthesis.topConcepts)) {
      doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(14)
      doc.text('Top Solution Concepts', contentX, doc.y)
      doc.moveDown(0.5)

      synthesis.topConcepts.forEach((concept, index) => {
        ensureSpace(150)

        doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(12)
        doc.text(`${concept.rank}. ${concept.title}`, contentX, doc.y, { width: contentWidth })
        doc.moveDown(0.5)

        if (concept.sitTools && concept.sitTools.length > 0) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica').fontSize(9)
          doc.text(`SIT Tools: ${concept.sitTools.join(', ')}`, contentX, doc.y, { width: contentWidth })
          doc.moveDown(0.5)
        }

        doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
        doc.text(concept.description, contentX, doc.y, { width: contentWidth })
        doc.moveDown(0.5)

        if (concept.whyPromising) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Why Promising: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(concept.whyPromising, { width: contentWidth })
          doc.moveDown(0.5)
        }

        if (concept.nextSteps) {
          doc.fillColor(MUTED_TEXT_COLOR).font('Helvetica-Bold').text('Next Steps: ', contentX, doc.y, { continued: true })
          doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').text(concept.nextSteps, { width: contentWidth })
          doc.moveDown(0.5)
        }

        if (index < synthesis.topConcepts.length - 1) {
          doc.moveDown(0.5)
          const y = doc.y
          doc
            .strokeColor('#f3f4f6')
            .lineWidth(0.5)
            .moveTo(contentX, y)
            .lineTo(contentX + contentWidth, y)
            .stroke()
          doc.y = y + 10
        }
      })

      doc.moveDown(1)
      addDivider()
    }

    // Constraint Alignment
    if (synthesis.constraintAlignment) {
      doc.fillColor(TITLE_COLOR).font('Helvetica-Bold').fontSize(14)
      doc.text('Constraint Alignment', contentX, doc.y)
      doc.moveDown(0.5)

      doc.fillColor(BODY_TEXT_COLOR).font('Helvetica').fontSize(10)
      doc.text(synthesis.constraintAlignment, contentX, doc.y, { width: contentWidth })
      doc.moveDown(1)
    }
  }

  // Finalize PDF
  doc.end()

  return finishPromise
}
