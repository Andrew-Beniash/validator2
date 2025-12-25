/**
 * Analysis API routes
 * Handles initialization and management of validation analysis sessions
 */

import fs from 'fs'
import { validateAnalysisPayload, createInitialAnalysisState } from '../validators/analysisValidator.js'
import { runAnalysis } from '../analysisExecutor.js'
import { generateSynthesisSummary } from '../synthesisService.js'
import { writeSummaryPdfForSession } from '../pdfReportService.js'
import { sendAnalysisReportEmail } from '../emailService.js'

/**
 * POST /api/analysis/init
 * Initialize a new analysis session with validated form data
 */
export function initializeAnalysis(req, res) {
  try {
    // Validate the incoming payload
    const validation = validateAnalysisPayload(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        details: validation.details
      })
    }

    // Ensure session exists
    if (!req.session) {
      return res.status(500).json({
        success: false,
        error: 'Session not initialized'
      })
    }

    // Map payload to session structure
    req.session.inputs = {
      validationRequest: {
        description: req.body.problem.description,
        location: req.body.clarification.location,
        targetCustomer: req.body.clarification.targetCustomer,
        teamSize: req.body.clarification.teamSize
      }
    }

    // Store API configuration (excluding API key for security)
    req.session.apiConfig = {
      email: req.body.config.email,
      provider: req.body.config.provider,
      model: req.body.config.model
      // NOTE: API key is NOT stored in session for security reasons
      // It will be passed directly to the analysis service when needed
    }

    // Initialize analysis state
    req.session.results = {
      analysis: createInitialAnalysisState()
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Analysis session initialized successfully',
      data: {
        analysisId: req.sessionId,
        status: req.session.results.analysis.status,
        steps: req.session.results.analysis.steps.map(step => ({
          id: step.id,
          name: step.name,
          status: step.status
        }))
      }
    })

  } catch (error) {
    console.error('Error initializing analysis:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * GET /api/analysis/report
 * Stream the final PDF report for the current session
 */
export function downloadAnalysisReportRoute(req, res) {
  try {
    if (!req.session?.results?.analysis || !req.session?.results?.report) {
      return res.status(404).json({
        success: false,
        error: 'No completed analysis/report found for this session'
      })
    }

    const analysis = req.session.results.analysis

    if (analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Analysis must be completed before downloading report'
      })
    }

    const report = req.session.results.report
    const filepath = report.filepath
    const filename = report.filename || 'analysis_report.pdf'

    if (!filepath) {
      return res.status(404).json({
        success: false,
        error: 'Report file path not available for this session'
      })
    }

    // Ensure file exists before attempting to stream
    fs.stat(filepath, (statError, stats) => {
      if (statError || !stats?.isFile()) {
        console.error('Report file not found or inaccessible:', statError || 'Not a file')
        return res.status(404).json({
          success: false,
          error: 'Report file not found for this session'
        })
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      )

      const stream = fs.createReadStream(filepath)

      stream.on('error', (error) => {
        console.error('Error streaming report file:', error)
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to read report file'
          })
        } else {
          res.end()
        }
      })

      stream.pipe(res)
    })
  } catch (error) {
    console.error('Error handling report download:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * GET /api/analysis/status
 * Get the current status of the analysis
 */
export function getAnalysisStatus(req, res) {
  try {
    if (!req.session?.results?.analysis) {
      return res.status(404).json({
        success: false,
        error: 'No analysis found for this session'
      })
    }

    const analysis = req.session.results.analysis

    return res.status(200).json({
      success: true,
      data: {
        status: analysis.status,
        startedAt: analysis.startedAt,
        completedAt: analysis.completedAt,
        currentStep: analysis.currentStep || null,
        currentStepLabel: analysis.currentStepLabel || null,
        currentStepIndex:
          typeof analysis.currentStepIndex === 'number' ? analysis.currentStepIndex : null,
        steps: analysis.steps.map(step => ({
          id: step.id,
          name: step.name,
          status: step.status,
          hasResult: !!step.result
        })),
        error: analysis.error
      }
    })

  } catch (error) {
    console.error('Error fetching analysis status:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * POST /api/analysis/run
 * Execute the analysis sequentially for all methodologies
 */
export async function runAnalysisRoute(req, res) {
  try {
    if (!req.session?.results?.analysis) {
      return res.status(404).json({
        success: false,
        error: 'No analysis initialized for this session'
      })
    }

    const apiKey = req.body?.apiKey

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'A valid API key (>= 20 chars) is required'
      })
    }

    const analysis = await runAnalysis(req.session, apiKey)

    return res.status(200).json({
      success: true,
      data: {
        status: analysis.status,
        startedAt: analysis.startedAt,
        completedAt: analysis.completedAt,
        currentStep: analysis.currentStep || null,
        currentStepLabel: analysis.currentStepLabel || null,
        currentStepIndex:
          typeof analysis.currentStepIndex === 'number' ? analysis.currentStepIndex : null,
        steps: analysis.steps.map(step => ({
          id: step.id,
          name: step.name,
          status: step.status,
          hasResult: !!step.result
        })),
        error: analysis.error
      }
    })
  } catch (error) {
    if (error.type === 'ANALYSIS_CONFLICT') {
      return res.status(409).json({
        success: false,
        error: error.message
      })
    }

    console.error('Error running analysis:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * POST /api/analysis/synthesize
 * Generate synthesized summary and PDF report
 */
export async function synthesizeAnalysisRoute(req, res) {
  try {
    if (!req.session?.results?.analysis) {
      return res.status(404).json({
        success: false,
        error: 'No analysis initialized for this session'
      })
    }

    const analysis = req.session.results.analysis
    if (analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Analysis must be completed before synthesis'
      })
    }

    const apiKey = req.body?.apiKey

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'A valid API key (>= 20 chars) is required'
      })
    }

    await generateSynthesisSummary(req.session, apiKey)
    const report = await writeSummaryPdfForSession(req.session)

    const summaryMeta = req.session.results.summary || {}

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          generatedAt: summaryMeta.generatedAt,
          provider: summaryMeta.provider,
          model: summaryMeta.model
        },
        report: {
          filename: report.filename
        }
      }
    })
  } catch (error) {
    console.error('Error synthesizing analysis:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * POST /api/analysis/email
 * Send final report and analysis files via email
 */
export async function sendAnalysisEmailRoute(req, res) {
  try {
    if (!req.session?.results?.analysis || !req.session?.results?.report) {
      return res.status(404).json({
        success: false,
        error: 'No completed analysis/report found for this session'
      })
    }

    const analysis = req.session.results.analysis

    if (analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Analysis must be completed before sending email'
      })
    }

    if (!req.session.apiConfig?.email) {
      return res.status(400).json({
        success: false,
        error: 'No recipient email configured for this session'
      })
    }

    const result = await sendAnalysisReportEmail(req.session)

    return res.status(200).json({
      success: true,
      data: {
        messageId: result.messageId || null
      }
    })
  } catch (error) {
    if (error.type === 'EMAIL_CONFIG_ERROR') {
      return res.status(500).json({
        success: false,
        error: 'Email configuration error',
        message: error.message
      })
    }

    if (error.type === 'EMAIL_SEND_ERROR') {
      return res.status(502).json({
        success: false,
        error: 'Failed to send email',
        message: error.message
      })
    }

    console.error('Error sending analysis email:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}
