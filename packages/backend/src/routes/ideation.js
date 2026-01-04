/**
 * Ideation API routes
 * Handles SCAMPER and other ideation technique execution
 */

import fs from 'fs'
import { executeScamper } from '../scamperService.js'
import { writeScamperPdfForSession } from '../scamperPdfService.js'

/**
 * POST /api/ideation/scamper
 * Execute SCAMPER ideation technique
 */
export async function runScamperRoute(req, res) {
  try {
    // Validate session exists
    if (!req.session) {
      return res.status(500).json({
        success: false,
        error: 'Session not initialized'
      })
    }

    // Validate API key from request body
    const { apiKey } = req.body
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Valid API key required'
      })
    }

    // Validate that analysis phase is completed
    if (!req.session.results?.analysis?.status || req.session.results.analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Problem validation must be completed before running ideation'
      })
    }

    // Execute SCAMPER with progress tracking
    const results = await executeScamper(req.session, apiKey, (progress) => {
      // Progress callback - can be used for real-time updates via WebSocket/SSE
      console.log('SCAMPER progress:', progress)
    })

    // Generate PDF report
    try {
      await writeScamperPdfForSession(req.session)
    } catch (pdfError) {
      console.error('Failed to generate SCAMPER PDF:', pdfError)
      // Don't fail the whole request if PDF generation fails
      // User can still download later
    }

    return res.status(200).json({
      success: true,
      message: 'SCAMPER ideation completed successfully',
      data: {
        status: results.status,
        lensesCompleted: Object.keys(results.lenses).length,
        topConceptsCount: results.synthesis?.topConcepts?.length || 0,
        reportAvailable: !!req.session.results.ideation.scamperReport
      }
    })

  } catch (error) {
    console.error('Error running SCAMPER ideation:', error)

    // Return appropriate error based on type
    if (error.message.includes('not found in session')) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data',
        message: error.message
      })
    }

    if (error.type === 'LLM_INPUT_ERROR' || error.type === 'LLM_NETWORK_ERROR' || error.type === 'LLM_PROVIDER_ERROR') {
      return res.status(502).json({
        success: false,
        error: 'LLM service error',
        message: error.message
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * GET /api/ideation/status
 * Get current ideation execution status
 */
export async function getIdeationStatus(req, res) {
  try {
    if (!req.session) {
      return res.status(500).json({
        success: false,
        error: 'Session not initialized'
      })
    }

    const scamperResults = req.session.results?.ideation?.scamper

    if (!scamperResults) {
      return res.status(404).json({
        success: false,
        error: 'No ideation session found'
      })
    }

    // Map lens results to steps for frontend progress display
    const steps = Object.entries(scamperResults.lenses || {}).map(([lensId, lensData]) => ({
      id: lensId,
      name: lensData.name,
      status: lensData.error ? 'failed' : 'completed'
    }))

    // Add synthesis step if it exists
    if (scamperResults.synthesis) {
      steps.push({
        id: 'synthesis',
        name: 'Synthesis & Ranking',
        status: scamperResults.synthesis.error ? 'failed' : 'completed'
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        status: scamperResults.status,
        steps,
        currentStepIndex: steps.length - 1,
        currentStepLabel: steps[steps.length - 1]?.name || null,
        error: scamperResults.error || null,
        reportAvailable: !!req.session.results.ideation.scamperReport
      }
    })

  } catch (error) {
    console.error('Error fetching ideation status:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}

/**
 * GET /api/ideation/report/scamper
 * Download SCAMPER ideation PDF report
 */
export async function downloadScamperReportRoute(req, res) {
  try {
    if (!req.session) {
      return res.status(500).json({
        success: false,
        error: 'Session not initialized'
      })
    }

    const scamperReport = req.session.results?.ideation?.scamperReport

    if (!scamperReport || !scamperReport.filepath) {
      return res.status(404).json({
        success: false,
        error: 'SCAMPER report not found',
        message: 'Please run the SCAMPER ideation technique first'
      })
    }

    const { filepath, filename } = scamperReport

    // Verify file exists
    if (!fs.existsSync(filepath)) {
      console.error('SCAMPER PDF file not found on disk:', filepath)
      return res.status(404).json({
        success: false,
        error: 'Report file not found',
        message: 'The report file is missing. Please re-run the ideation.'
      })
    }

    // Stream the PDF
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const fileStream = fs.createReadStream(filepath)
    fileStream.on('error', (error) => {
      console.error('Error streaming SCAMPER PDF:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to read report file'
        })
      }
    })

    fileStream.pipe(res)

  } catch (error) {
    console.error('Error downloading SCAMPER report:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}
