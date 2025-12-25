import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'url'
import path from 'path'
import { sendAnalysisReportEmail } from '../src/emailService.js'

const __filename = fileURLToPath(import.meta.url)

describe('emailService.sendAnalysisReportEmail', () => {
  const realCreateTransport = nodemailer.createTransport
  const realEnv = { ...process.env }
  let sendMailCalls = []

  beforeEach(() => {
    sendMailCalls = []
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_SECURE = 'false'
    process.env.SMTP_USER = 'user'
    process.env.SMTP_PASS = 'pass'
    process.env.EMAIL_FROM = 'Problem Validator <no-reply@example.com>'

    nodemailer.createTransport = () => ({
      async sendMail(options) {
        sendMailCalls.push(options)
        return { messageId: 'test-id' }
      }
    })
  })

  afterEach(() => {
    nodemailer.createTransport = realCreateTransport
    process.env = { ...realEnv }
  })

  test('sends email with PDF and TXT attachments', async () => {
    const session = {
      apiConfig: {
        email: 'recipient@example.com'
      },
      results: {
        report: {
          filename: 'session_final_report.pdf',
          filepath: __filename // existing file path for test
        },
        analysis: {
          files: [
            {
              filename: 'session_JTBD.txt',
              filepath: __filename
            },
            {
              filename: 'session_DesignThinking.txt',
              filepath: __filename
            }
          ]
        }
      }
    }

    const result = await sendAnalysisReportEmail(session)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.messageId, 'test-id')
    assert.strictEqual(sendMailCalls.length, 1)

    const call = sendMailCalls[0]
    assert.strictEqual(call.to, 'recipient@example.com')
    assert.strictEqual(call.from, process.env.EMAIL_FROM)
    assert.ok(Array.isArray(call.attachments))
    // One PDF + two TXT
    assert.strictEqual(call.attachments.length, 3)
  })

  test('throws EMAIL_CONFIG_ERROR when SMTP config missing', async () => {
    delete process.env.SMTP_HOST

    const session = {
      apiConfig: { email: 'recipient@example.com' },
      results: {
        report: { filename: 'x.pdf', filepath: __filename },
        analysis: { files: [] }
      }
    }

    await assert.rejects(
      () => sendAnalysisReportEmail(session),
      err => err.type === 'EMAIL_CONFIG_ERROR'
    )
  })

  test('throws EMAIL_SEND_ERROR when sendMail fails', async () => {
    nodemailer.createTransport = () => ({
      async sendMail() {
        throw new Error('simulated send failure')
      }
    })

    const session = {
      apiConfig: { email: 'recipient@example.com' },
      results: {
        report: { filename: 'x.pdf', filepath: __filename },
        analysis: { files: [] }
      }
    }

    await assert.rejects(
      () => sendAnalysisReportEmail(session),
      err => err.type === 'EMAIL_SEND_ERROR'
    )
  })
})
