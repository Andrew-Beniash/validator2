/**
 * Sequential Analysis Execution Engine
 *
 * Runs all configured methodologies in order, using prompt templates
 * and the provider-agnostic llmService. Results and progress are
 * stored on the session in session.results.analysis.
 */

import {
  METHODOLOGY_STEPS,
  buildPrompt,
  extractContextFromSession
} from './promptTemplates.js'
import llmService from './llmService.js'
import { writeMethodFilesForSession } from './fileOutputService.js'

/**
 * Run analysis for the given session using the provided API key.
 *
 * @param {object} session - Session object (from session middleware)
 * @param {string} apiKey - Provider API key (not stored in session)
 * @param {object} [options]
 * @param {number} [options.timeoutMs] - Optional request timeout override
 * @returns {Promise<object>} Updated analysis state
 */
export async function runAnalysis(session, apiKey, options = {}) {
  if (!session || typeof session !== 'object') {
    const err = new Error('Session is required')
    err.type = 'ANALYSIS_INPUT_ERROR'
    throw err
  }

  if (!session.inputs?.validationRequest) {
    const err = new Error('Session is missing validationRequest inputs')
    err.type = 'ANALYSIS_INPUT_ERROR'
    throw err
  }

  if (!session.apiConfig?.provider || !session.apiConfig?.model) {
    const err = new Error('Session is missing apiConfig provider or model')
    err.type = 'ANALYSIS_INPUT_ERROR'
    throw err
  }

  if (!session.results?.analysis) {
    const err = new Error('Analysis state not initialized for this session')
    err.type = 'ANALYSIS_STATE_MISSING'
    throw err
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
    const err = new Error('A valid API key (>= 20 chars) is required')
    err.type = 'ANALYSIS_INPUT_ERROR'
    throw err
  }

  const analysis = session.results.analysis

  // Handle terminal states
  if (analysis.status === 'completed') {
    // Idempotent: nothing to do, just return existing state
    return analysis
  }

  if (analysis.status === 'failed') {
    const err = new Error('Analysis has failed and cannot be re-run for this session')
    err.type = 'ANALYSIS_CONFLICT'
    throw err
  }

  // Extract prompt context from session
  const context = extractContextFromSession(session)

  const now = new Date().toISOString()
  if (!analysis.startedAt) {
    analysis.startedAt = now
  }
  analysis.status = 'in-progress'

  if (typeof session.save === 'function') {
    await session.save()
  }

  const timeoutMs = options.timeoutMs

  // Iterate through methodologies in configured order
  for (let index = 0; index < METHODOLOGY_STEPS.length; index++) {
    const stepMeta = METHODOLOGY_STEPS[index]

    let step = Array.isArray(analysis.steps)
      ? analysis.steps.find(s => s.id === stepMeta.id)
      : null

    // If step is missing for some reason, create it
    if (!step) {
      if (!Array.isArray(analysis.steps)) {
        analysis.steps = []
      }
      step = {
        id: stepMeta.id,
        name: stepMeta.name,
        status: 'pending',
        result: null
      }
      analysis.steps.push(step)
    }

    // Skip already completed steps (supports resume)
    if (step.status === 'completed') {
      continue
    }

    try {
      // Mark step as in-progress and update progress metadata
      step.status = 'in-progress'
      analysis.currentStep = step.id
      analysis.currentStepLabel = stepMeta.progressLabel
      analysis.currentStepIndex = index
      analysis.error = null

      if (typeof session.save === 'function') {
        await session.save()
      }

      const prompt = buildPrompt(stepMeta.id, context)

      const result = await llmService.analyze(prompt, {
        provider: session.apiConfig.provider,
        model: session.apiConfig.model,
        apiKey,
        timeoutMs,
        metadata: {
          sessionId: session.id,
          stepId: stepMeta.id
        }
      })

      // Store full normalized result
      step.result = result
      step.status = 'completed'

      if (typeof session.save === 'function') {
        await session.save()
      }
    } catch (error) {
      // Mark failure on current step and analysis
      step.status = 'failed'
      analysis.status = 'failed'
      analysis.error = error.message || 'Analysis step failed'

      if (typeof session.save === 'function') {
        await session.save()
      }

      // Re-throw so caller/route can respond appropriately
      throw error
    }
  }

  // All steps completed successfully
  analysis.status = 'completed'
  analysis.completedAt = new Date().toISOString()
  // Keep currentStep/currentStepLabel pointing at the last step for UI

  if (typeof session.save === 'function') {
    await session.save()
  }

  // Generate individual method files; failures here should not change
  // analysis status, but should be recorded for debugging.
  try {
    const files = await writeMethodFilesForSession(session)
    analysis.files = files
    if (typeof session.save === 'function') {
      await session.save()
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error writing analysis files:', error)
    analysis.error = analysis.error || 'Failed to write analysis files'
    if (typeof session.save === 'function') {
      await session.save()
    }
  }

  return analysis
}

