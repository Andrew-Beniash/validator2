/**
 * SCAMPER PDF Report Generator
 * Creates a downloadable PDF report for SCAMPER ideation results
 */

import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import { getBaseOutputDir, sanitizeFilenamePart } from './fileOutputService.js'
import { SCAMPER_LENSES } from './scamperPromptTemplates.js'

/**
 * Generate a SCAMPER ideation PDF report
 * @param {object} session - Express session with SCAMPER results
 * @returns {Promise<{ filename: string, filepath: string }>}
 */
export async function writeScamperPdfForSession(session) {
  if (!session?.results?.ideation?.scamper) {
    const err = new Error('No SCAMPER results found on session')
    err.type = 'PDF_INPUT_ERROR'
    throw err
  }

  const scamperResults = session.results.ideation.scamper

  if (scamperResults.status !== 'completed' && scamperResults.status !== 'completed-with-errors') {
    const err = new Error('SCAMPER execution not completed')
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
  const filename = `${sessionId}_scamper_ideation.pdf`
  const filepath = path.join(baseDir, filename)

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  let stream

  // Visual style tokens (matching validation PDF)
  const PRIMARY_COLOR = '#10b981' // Green for ideation phase
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
      const err = new Error('Failed to write SCAMPER PDF report')
      err.type = 'PDF_WRITE_ERROR'
      err.cause = error
      reject(err)
    }

    stream.on('error', handleError)
    doc.on('error', handleError)

    stream.on('finish', async () => {
      // Store report metadata on session
      if (!session.results.ideation.scamperReport) {
        session.results.ideation.scamperReport = {}
      }
      session.results.ideation.scamperReport.filename = filename
      session.results.ideation.scamperReport.filepath = filepath
      session.results.ideation.scamperReport.generatedAt = new Date().toISOString()

      if (typeof session.save === 'function') {
        await session.save()
      }

      resolve({ filename, filepath })
    })
  })

  doc.pipe(stream)

  const generatedAt = scamperResults.completedAt || new Date().toISOString()
  const problemDescription = session.inputs?.validationRequest?.description || 'No description provided'

  // Helper functions
  const addHeader = () => {
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(MUTED_TEXT_COLOR)

    doc.text('Problem Discovery Platform', doc.page.margins.left, 20, {
      align: 'left',
      width: innerWidth / 2
    })

    doc.text(
      new Date(generatedAt).toLocaleString(),
      doc.page.margins.left + innerWidth / 2,
      20,
      {
        align: 'right',
        width: innerWidth / 2
      }
    )

    doc.moveDown(2)
  }

  const addSectionDivider = () => {
    doc.moveDown(0.5)
    doc
      .strokeColor(DIVIDER_COLOR)
      .lineWidth(1)
      .moveTo(contentX, doc.y)
      .lineTo(contentX + contentWidth, doc.y)
      .stroke()
    doc.moveDown(0.75)
  }

  const addHeading = (text, color = TITLE_COLOR) => {
    doc.moveDown(0.5)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(color)
      .text(text, contentX, doc.y, {
        width: contentWidth
      })
      .moveDown(0.25)

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(BODY_TEXT_COLOR)
  }

  const addSubheading = (text) => {
    doc.moveDown(0.25)
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(TITLE_COLOR)
      .text(text, contentX, doc.y, {
        width: contentWidth
      })
      .moveDown(0.15)

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(BODY_TEXT_COLOR)
  }

  const addBodyText = (text) => {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(BODY_TEXT_COLOR)
      .text(text, contentX, doc.y, {
        width: contentWidth,
        align: 'left',
        lineGap: 4
      })
  }

  const checkPageBreak = (neededSpace = 100) => {
    if (doc.y + neededSpace > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
    }
  }

  // Apply header on every new page
  doc.on('pageAdded', () => {
    addHeader()
  })

  // ==================== COVER PAGE ====================
  addHeader()

  // Title
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .fillColor(TITLE_COLOR)
    .text('Solution Ideation Report', contentX, doc.y, {
      align: 'center',
      width: contentWidth
    })
    .moveDown(0.3)

  doc
    .fontSize(16)
    .font('Helvetica')
    .fillColor(PRIMARY_COLOR)
    .text('SCAMPER Technique', contentX, doc.y, {
      align: 'center',
      width: contentWidth
    })
    .moveDown(0.4)

  // Accent bar
  doc
    .fillColor(PRIMARY_COLOR)
    .rect(contentX + (contentWidth - 140) / 2, doc.y, 140, 3)
    .fill()
    .moveDown(1.5)

  // Metadata
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(MUTED_TEXT_COLOR)
    .text(`Generated: ${new Date(generatedAt).toLocaleString()}`, contentX, doc.y, {
      width: contentWidth,
      align: 'center'
    })

  if (session.apiConfig?.provider && session.apiConfig?.model) {
    doc.text(`Model: ${session.apiConfig.provider} / ${session.apiConfig.model}`, contentX, doc.y, {
      width: contentWidth,
      align: 'center'
    })
  }

  doc.moveDown(2)
  addSectionDivider()

  // ==================== PROBLEM CONTEXT ====================
  addHeading('Problem Context')
  addBodyText(problemDescription)

  if (session.inputs?.clarification) {
    doc.moveDown(0.5)
    const clarification = session.inputs.clarification
    if (clarification.location) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(MUTED_TEXT_COLOR)
        .text(`Location: `, contentX, doc.y, { continued: true })
        .font('Helvetica')
        .text(clarification.location)
    }
    if (clarification.targetCustomer) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(MUTED_TEXT_COLOR)
        .text(`Target Customer: `, contentX, doc.y, { continued: true })
        .font('Helvetica')
        .text(clarification.targetCustomer)
    }
    if (clarification.teamSize) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(MUTED_TEXT_COLOR)
        .text(`Team Size: `, contentX, doc.y, { continued: true })
        .font('Helvetica')
        .text(clarification.teamSize)
    }
  }

  doc.moveDown(1)
  addSectionDivider()

  // ==================== SCAMPER METHOD OVERVIEW ====================
  addHeading('About SCAMPER')
  addBodyText(
    'SCAMPER is a creative thinking technique that uses seven lenses to generate innovative solution variations. Each lens explores different ways to modify, combine, or rethink the current approach to solving your problem.'
  )

  doc.moveDown(1.5)

  // ==================== PER-LENS IDEAS ====================
  for (const lens of SCAMPER_LENSES) {
    const lensData = scamperResults.lenses[lens.id]

    if (!lensData) continue

    checkPageBreak(150)

    // Lens heading with icon number
    doc.moveDown(0.5)
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(PRIMARY_COLOR)
      .text(`${lens.name}`, contentX, doc.y, {
        width: contentWidth
      })
      .moveDown(0.15)

    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor(MUTED_TEXT_COLOR)
      .text(lens.description, contentX, doc.y, {
        width: contentWidth
      })
      .moveDown(0.5)

    // Ideas for this lens
    if (lensData.error) {
      doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor('#dc2626')
        .text(`Error: ${lensData.error}`, contentX, doc.y, {
          width: contentWidth
        })
        .moveDown(0.75)
    } else if (lensData.ideas && lensData.ideas.length > 0) {
      lensData.ideas.forEach((idea, index) => {
        checkPageBreak(120)

        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(ACCENT_COLOR)
          .text(`${index + 1}. ${idea.title}`, contentX, doc.y, {
            width: contentWidth
          })
          .moveDown(0.1)

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(BODY_TEXT_COLOR)
          .text(idea.description, contentX, doc.y, {
            width: contentWidth,
            lineGap: 3
          })
          .moveDown(0.15)

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(MUTED_TEXT_COLOR)
          .text('How it addresses the problem: ', contentX, doc.y, { continued: true })
          .font('Helvetica')
          .text(idea.problemConnection, {
            width: contentWidth,
            lineGap: 2
          })

        if (idea.implementationNotes) {
          doc.moveDown(0.1)
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(MUTED_TEXT_COLOR)
            .text('Implementation notes: ', contentX, doc.y, { continued: true })
            .font('Helvetica')
            .text(idea.implementationNotes, {
              width: contentWidth,
              lineGap: 2
            })
        }

        doc.moveDown(0.5)
      })
    } else {
      doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .fillColor(MUTED_TEXT_COLOR)
        .text('No ideas generated for this lens.', contentX, doc.y, {
          width: contentWidth
        })
        .moveDown(0.5)
    }

    doc.moveDown(0.25)
    addSectionDivider()
  }

  // ==================== TOP CONCEPTS ====================
  if (scamperResults.synthesis && scamperResults.synthesis.topConcepts) {
    doc.addPage()

    addHeading('Top Solution Concepts', PRIMARY_COLOR)

    if (scamperResults.synthesis.comparativeAnalysis) {
      addBodyText(scamperResults.synthesis.comparativeAnalysis)
      doc.moveDown(1)
    }

    addSubheading('Ranked Recommendations')

    scamperResults.synthesis.topConcepts.forEach((concept, index) => {
      checkPageBreak(100)

      doc.moveDown(0.5)
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(PRIMARY_COLOR)
        .text(`#${concept.rank} — ${concept.title}`, contentX, doc.y, {
          width: contentWidth
        })
        .moveDown(0.15)

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(MUTED_TEXT_COLOR)
        .text('Why this concept stands out:', contentX, doc.y)

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(BODY_TEXT_COLOR)
        .text(concept.justification, contentX, doc.y, {
          width: contentWidth,
          lineGap: 3
        })
        .moveDown(0.2)

      if (concept.nextSteps) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(MUTED_TEXT_COLOR)
          .text('Next Steps:', contentX, doc.y)

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor(BODY_TEXT_COLOR)
          .text(concept.nextSteps, contentX, doc.y, {
            width: contentWidth,
            lineGap: 3
          })
      }

      doc.moveDown(0.75)
    })
  }

  // ==================== FOOTER ====================
  doc.moveDown(2)
  doc
    .fontSize(9)
    .font('Helvetica-Oblique')
    .fillColor(MUTED_TEXT_COLOR)
    .text(
      'This ideation report was generated using the SCAMPER creative thinking technique to explore solution variations for your validated problem.',
      contentX,
      doc.y,
      {
        width: contentWidth,
        align: 'center'
      }
    )

  doc.end()

  return finishPromise
}

export default {
  writeScamperPdfForSession
}
