import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import fs from 'fs/promises'
import fsSync from 'fs'
import os from 'os'
import path from 'path'
import { writeSummaryPdfForSession } from '../src/pdfReportService.js'

describe('pdfReportService.writeSummaryPdfForSession', () => {
  const originalTmpDir = process.env.ANALYSIS_TMP_DIR
  let tmpDir

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `validator-pdf-test-${Date.now()}`)
    process.env.ANALYSIS_TMP_DIR = tmpDir
    await fs.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    process.env.ANALYSIS_TMP_DIR = originalTmpDir
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  test('writes a PDF file and stores report metadata', async () => {
    const session = {
      id: 'session-pdf',
      apiConfig: {
        provider: 'openai',
        model: 'gpt-4',
        email: 'user@example.com'
      },
      results: {
        summary: {
          text: 'This is a synthesized summary of the problem validation.',
          generatedAt: new Date().toISOString(),
          provider: 'openai',
          model: 'gpt-4'
        },
        report: null
      },
      async save() {}
    }

    const { filename, filepath } = await writeSummaryPdfForSession(session)

    assert.ok(filename.endsWith('_final_report.pdf'))
    const stats = await fs.stat(filepath)
    assert.ok(stats.isFile())
    assert.ok(stats.size > 0)

    assert.ok(session.results.report)
    assert.strictEqual(session.results.report.filename, filename)
    assert.strictEqual(session.results.report.filepath, filepath)
    assert.ok(session.results.report.generatedAt)
  })

  test('throws PDF_WRITE_ERROR when stream fails', async () => {
    const session = {
      id: 'session-pdf-error',
      apiConfig: {
        provider: 'openai',
        model: 'gpt-4'
      },
      results: {
        summary: {
          text: 'Summary text',
          generatedAt: new Date().toISOString(),
          provider: 'openai',
          model: 'gpt-4'
        },
        report: null
      },
      async save() {}
    }

    const realCreateWriteStream = fsSync.createWriteStream
    fsSync.createWriteStream = () => {
      throw new Error('simulated stream error')
    }

    await assert.rejects(
      () => writeSummaryPdfForSession(session),
      err => err.type === 'PDF_WRITE_ERROR'
    )

    fsSync.createWriteStream = realCreateWriteStream
  })
})
