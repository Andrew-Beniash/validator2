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

  // Title
  doc.fontSize(20).font('Helvetica-Bold')
  doc.text('Problem Validation Summary Report', {
    align: 'center'
  })
  doc.moveDown()

  doc.fontSize(10).font('Helvetica')
  doc.text(`Generated at: ${generatedAt}`)
  if (session.apiConfig?.provider && session.apiConfig?.model) {
    doc.text(`Model: ${session.apiConfig.provider} / ${session.apiConfig.model}`)
  }
  if (session.apiConfig?.email) {
    doc.text(`Recipient: ${session.apiConfig.email}`)
  }
  doc.moveDown(1.5)

  // Section headings
  const addHeading = (text) => {
    doc.fontSize(14).font('Helvetica-Bold')
    doc.text(text)
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica')
  }

  addHeading('1. Executive Summary & Key Insights')

  // Body text: use synthesized summary as main content
  const paragraphs = summary.split(/\n{2,}/)
  paragraphs.forEach(p => {
    const trimmed = p.trim()
    if (trimmed.length > 0) {
      doc.text(trimmed, {
        align: 'left'
      })
      doc.moveDown(0.75)
    }
  })

  // New page for recommendations / risks if needed
  doc.addPage()

  addHeading('2. Validation Recommendations')
  doc.text(
    'Use the insights above to prioritize discovery actions. Focus on validating the riskiest assumptions first, using interviews, experiments, and real-world behavior data.',
    { align: 'left' }
  )
  doc.moveDown(1)

  addHeading('3. Risks & Next Steps')
  doc.text(
    'Review the synthesized analysis with your team and stakeholders. Align on the definition of the problem, target customer, and success criteria before investing heavily in solutions.',
    { align: 'left' }
  )

  doc.end()

  return finishPromise
}
