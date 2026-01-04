/**
 * Ideation API routes
 * Handles SCAMPER, SIT, and other ideation technique execution
 */

import fs from 'fs'
import { executeScamper } from '../scamperService.js'
import { writeScamperPdfForSession } from '../scamperPdfService.js'
import { executeSit } from '../sitService.js'
import { writeSitPdfForSession } from '../sitPdfService.js'

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
 * POST /api/ideation/sit
 * Execute SIT (Systematic Inventive Thinking) ideation technique
 */
export async function runSitRoute(req, res) {
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

    // Execute SIT with progress tracking
    const results = await executeSit(req.session, apiKey, (progress) => {
      // Progress callback - can be used for real-time updates via WebSocket/SSE
      console.log('SIT progress:', progress)
    })

    // Generate PDF report
    try {
      await writeSitPdfForSession(req.session)
    } catch (pdfError) {
      console.error('Failed to generate SIT PDF:', pdfError)
      // Don't fail the whole request if PDF generation fails
      // User can still download later
    }

    return res.status(200).json({
      success: true,
      message: 'SIT ideation completed successfully',
      data: {
        status: results.status,
        toolsCompleted: Object.keys(results.tools).length,
        topConceptsCount: results.synthesis?.topConcepts?.length || 0,
        reportAvailable: !!req.session.results.ideation.sitReport
      }
    })

  } catch (error) {
    console.error('Error running SIT ideation:', error)

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
 * Get current ideation execution status (SCAMPER and SIT)
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
    const sitResults = req.session.results?.ideation?.sit

    if (!scamperResults && !sitResults) {
      return res.status(404).json({
        success: false,
        error: 'No ideation session found'
      })
    }

    // Combine steps from both techniques
    const steps = []

    // Add SCAMPER steps
    if (scamperResults) {
      Object.entries(scamperResults.lenses || {}).forEach(([lensId, lensData]) => {
        steps.push({
          id: `scamper-${lensId}`,
          name: `SCAMPER: ${lensData.name}`,
          status: lensData.error ? 'failed' : 'completed'
        })
      })
      if (scamperResults.synthesis) {
        steps.push({
          id: 'scamper-synthesis',
          name: 'SCAMPER: Synthesis & Ranking',
          status: scamperResults.synthesis.error ? 'failed' : 'completed'
        })
      }
    }

    // Add SIT steps
    if (sitResults) {
      Object.entries(sitResults.tools || {}).forEach(([toolId, toolData]) => {
        steps.push({
          id: `sit-${toolId}`,
          name: `SIT: ${toolData.name}`,
          status: toolData.error ? 'failed' : 'completed'
        })
      })
      if (sitResults.synthesis) {
        steps.push({
          id: 'sit-synthesis',
          name: 'SIT: Synthesis & Ranking',
          status: sitResults.synthesis.error ? 'failed' : 'completed'
        })
      }
    }

    // Determine overall status
    let overallStatus = 'completed'
    if (scamperResults?.status === 'in-progress' || sitResults?.status === 'in-progress') {
      overallStatus = 'in-progress'
    } else if (scamperResults?.status === 'failed' || sitResults?.status === 'failed') {
      overallStatus = 'failed'
    }

    return res.status(200).json({
      success: true,
      data: {
        status: overallStatus,
        steps,
        currentStepIndex: steps.length - 1,
        currentStepLabel: steps[steps.length - 1]?.name || null,
        error: null,
        scamperReportAvailable: !!req.session.results?.ideation?.scamperReport,
        sitReportAvailable: !!req.session.results?.ideation?.sitReport
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

/**
 * GET /api/ideation/report/sit
 * Download SIT ideation PDF report
 */
export async function downloadSitReportRoute(req, res) {
  try {
    if (!req.session) {
      return res.status(500).json({
        success: false,
        error: 'Session not initialized'
      })
    }

    const sitReport = req.session.results?.ideation?.sitReport

    if (!sitReport || !sitReport.filepath) {
      return res.status(404).json({
        success: false,
        error: 'SIT report not found',
        message: 'Please run the SIT ideation technique first'
      })
    }

    const { filepath, filename } = sitReport

    // Verify file exists
    if (!fs.existsSync(filepath)) {
      console.error('SIT PDF file not found on disk:', filepath)
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
      console.error('Error streaming SIT PDF:', error)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to read report file'
        })
      }
    })

    fileStream.pipe(res)

  } catch (error) {
    console.error('Error downloading SIT report:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    })
  }
}
