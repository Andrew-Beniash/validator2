import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import os from 'os'
import PDFDocument from 'pdfkit'
import { getBaseOutputDir, sanitizeFilenamePart } from './fileOutputService.js'

/**
 * Generate a PDF summary report for the session's synthesized summary.
 *
 * @param {object} session
 * @returns {Promise<{ filename: string, filepath: string }>}
 */
export async function writeSummaryPdfForSession(session) {
  if (!session?.results?.summary?.text) {
    const err = new Error('No synthesized summary found on session')
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
  const filename = `${sessionId}_final_report.pdf`
  const filepath = path.join(baseDir, filename)

  const doc = new PDFDocument({ size: 'A4', margin: 50 })
  let stream

  // Shared visual style tokens
  const PRIMARY_COLOR = '#4f46e5' // Indigo accent to match app UI
  const TITLE_COLOR = '#111827'
  const BODY_TEXT_COLOR = '#374151'
  const MUTED_TEXT_COLOR = '#6b7280'
  const DIVIDER_COLOR = '#e5e7eb'

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
      const err = new Error('Failed to write PDF report')
      err.type = 'PDF_WRITE_ERROR'
      err.cause = error
      reject(err)
    }

    stream.on('error', handleError)
    doc.on('error', handleError)

    stream.on('finish', async () => {
      // Store report metadata on session
      if (!session.results.report) {
        session.results.report = {}
      }
      session.results.report.filename = filename
      session.results.report.filepath = filepath
      session.results.report.generatedAt = new Date().toISOString()

      if (typeof session.save === 'function') {
        await session.save()
      }

      resolve({ filename, filepath })
    })
  })

  doc.pipe(stream)

  const summary = session.results.summary.text
  const generatedAt = session.results.summary.generatedAt || new Date().toISOString()

  const bodyTextOptions = {
    align: 'left',
    width: contentWidth,
    lineGap: 4
  }

  const addHeader = () => {
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(MUTED_TEXT_COLOR)

    // App name on the left
    doc.text('Problem Discovery Platform', doc.page.margins.left, 20, {
      align: 'left',
      width: innerWidth / 2
    })

    // Timestamp on the right
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

  const addHeading = (text) => {
    doc.moveDown(0.5)
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(TITLE_COLOR)
      .text(text, contentX, doc.y, {
        width: contentWidth
      })
      .moveDown(0.25)

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor(BODY_TEXT_COLOR)
  }

  // Apply header on every new page
  doc.on('pageAdded', () => {
    addHeader()
  })

  // First page header
  addHeader()

  // Title
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor(TITLE_COLOR)
    .text('Problem Validation Summary Report', contentX, doc.y, {
      align: 'center',
      width: contentWidth
    })
    .moveDown(0.4)

  // Accent bar under title
  doc
    .fillColor(PRIMARY_COLOR)
    .rect(contentX + (contentWidth - 140) / 2, doc.y, 140, 3)
    .fill()
    .moveDown(1)

  // Metadata block
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor(MUTED_TEXT_COLOR)
    .text(`Generated at: ${generatedAt}`, contentX, doc.y, {
      width: contentWidth
    })

  if (session.apiConfig?.provider && session.apiConfig?.model) {
    doc.text(`Model: ${session.apiConfig.provider} / ${session.apiConfig.model}`, contentX, doc.y, {
      width: contentWidth
    })
  }
  if (session.apiConfig?.email) {
    doc.text(`Recipient: ${session.apiConfig.email}`, contentX, doc.y, {
      width: contentWidth
    })
  }
  doc.moveDown(1.25)

  addSectionDivider()

  addHeading('1. Executive Summary & Key Insights')

  // Body text: use synthesized summary as main content
  const paragraphs = summary.split(/\n{2,}/)
  paragraphs.forEach(p => {
    const trimmed = p.trim()
    if (trimmed.length > 0) {
      doc.text(trimmed, contentX, doc.y, bodyTextOptions)
      doc.moveDown(0.75)
    }
  })

  // New page for recommendations / risks and detailed analyses if needed
  doc.addPage()

  addHeading('2. Validation Recommendations')
  doc.text(
    'Use the insights above to prioritize discovery actions. Focus on validating the riskiest assumptions first, using interviews, experiments, and real-world behavior data.',
    contentX,
    doc.y,
    bodyTextOptions
  )
  doc.moveDown(1)

  addHeading('3. Risks & Next Steps')
  doc.text(
    'Review the synthesized analysis with your team and stakeholders. Align on the definition of the problem, target customer, and success criteria before investing heavily in solutions.',
    contentX,
    doc.y,
    bodyTextOptions
  )

  // Include the full text of each completed methodology analysis
  const analysisSteps = Array.isArray(session.results?.analysis?.steps)
    ? session.results.analysis.steps
    : []

  if (analysisSteps.length > 0) {
    doc.addPage()
    addHeading('4. Individual Method Analyses')

    analysisSteps.forEach((step) => {
      const content = step?.result?.content

      if (!content || typeof content !== 'string') {
        return
      }

      // Method heading
      doc
        .fontSize(13)
        .font('Helvetica-Bold')
        .fillColor(PRIMARY_COLOR)
        .text(step.name || step.id || 'Method', contentX, doc.y, {
          align: 'left',
          width: contentWidth
        })
        .moveDown(0.25)

      // Method body
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(BODY_TEXT_COLOR)
        .text(content, contentX, doc.y, {
          align: 'left',
          width: contentWidth,
          lineGap: 3
        })
      doc.moveDown(1.25)
    })
  }

  doc.end()

  return finishPromise
}
