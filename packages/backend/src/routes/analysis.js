/**
 * Analysis API routes
 * Handles initialization and management of validation analysis sessions
 */

import { validateAnalysisPayload, createInitialAnalysisState } from '../validators/analysisValidator.js'

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
