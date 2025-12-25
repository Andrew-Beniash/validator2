import nodemailer from 'nodemailer'
import { promises as fs } from 'fs'

/**
 * Simple email validation (same pattern as analysisValidator)
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Send analysis report email with PDF and per-method TXT attachments.
 *
 * @param {object} session
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
export async function sendAnalysisReportEmail(session) {
  const to = session?.apiConfig?.email
  if (!to || typeof to !== 'string' || !isValidEmail(to)) {
    const err = new Error('Recipient email is invalid or missing')
    err.type = 'EMAIL_INPUT_ERROR'
    throw err
  }

  const report = session?.results?.report
  const analysis = session?.results?.analysis

  if (!report?.filepath || !report?.filename) {
    const err = new Error('Report PDF metadata missing on session')
    err.type = 'EMAIL_INPUT_ERROR'
    throw err
  }

  if (!analysis || !Array.isArray(analysis.files)) {
    const err = new Error('Method files metadata missing on session')
    err.type = 'EMAIL_INPUT_ERROR'
    throw err
  }

  // Optionally ensure files exist
  try {
    await fs.stat(report.filepath)
  } catch {
    const err = new Error('Report PDF file not found')
    err.type = 'EMAIL_INPUT_ERROR'
    throw err
  }

  const attachments = [
    {
      filename: report.filename,
      path: report.filepath,
      contentType: 'application/pdf'
    }
  ]

  for (const f of analysis.files) {
    if (!f?.filepath || !f?.filename) continue
    attachments.push({
      filename: f.filename,
      path: f.filepath,
      contentType: 'text/plain'
    })
  }

  const from = process.env.EMAIL_FROM
  const subject = 'Your Problem Validation Analysis is Ready'

  const text = `Dear User,

Your problem validation analysis has been completed. We've analyzed your problem statement through 5 proven methodologies:

- Jobs-to-be-Done (JTBD)
- Design Thinking – Define Phase
- Lean Problem Validation
- Root Cause Analysis
- Opportunity Solution Tree

Attached you'll find:
- Final synthesized summary report (PDF)
- Detailed methodology analyses (TXT files)

Next steps: Review the validation path and recommendations in the report, then align with your team on what to validate next.

Best regards,
Problem Discovery Platform`

  const html = `<p>Dear User,</p>
<p>Your problem validation analysis has been completed. We've analyzed your problem statement through 5 proven methodologies:</p>
<ul>
  <li>Jobs-to-be-Done (JTBD)</li>
  <li>Design Thinking – Define Phase</li>
  <li>Lean Problem Validation</li>
  <li>Root Cause Analysis</li>
  <li>Opportunity Solution Tree</li>
</ul>
<p>Attached you'll find:</p>
<ul>
  <li>Final synthesized summary report (PDF)</li>
  <li>Detailed methodology analyses (TXT files)</li>
</ul>
<p>Next steps: Review the validation path and recommendations in the report, then align with your team on what to validate next.</p>
<p>Best regards,<br/>Problem Discovery Platform</p>`

  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass || !process.env.EMAIL_FROM) {
    const err = new Error('SMTP configuration is incomplete')
    err.type = 'EMAIL_CONFIG_ERROR'
    throw err
  }

  const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true'

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10) || 587,
    secure,
    auth: { user, pass }
  })

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments
    })

    // eslint-disable-next-line no-console
    console.log('Email sent:', { to, messageId: info.messageId })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    const err = new Error('Failed to send analysis email')
    err.type = 'EMAIL_SEND_ERROR'
    err.cause = error
    throw err
  }
}
