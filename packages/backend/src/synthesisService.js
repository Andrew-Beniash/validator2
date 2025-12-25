import { buildSynthesisPrompt } from './synthesisTemplates.js'
import llmService from './llmService.js'

/**
 * Generate a synthesized summary across all methodologies and
 * store it on the session.
 *
 * @param {object} session
 * @param {string} apiKey
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ summaryText: string }>}
 */
export async function generateSynthesisSummary(session, apiKey, options = {}) {
  if (!session?.results?.analysis) {
    const err = new Error('Analysis results not found on session')
    err.type = 'SYNTHESIS_INPUT_ERROR'
    throw err
  }

  const analysis = session.results.analysis

  if (analysis.status !== 'completed') {
    const err = new Error('Analysis must be completed before synthesis')
    err.type = 'SYNTHESIS_STATE_ERROR'
    throw err
  }

  if (!session.apiConfig?.provider || !session.apiConfig?.model) {
    const err = new Error('Session is missing apiConfig provider or model')
    err.type = 'SYNTHESIS_INPUT_ERROR'
    throw err
  }

  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
    const err = new Error('A valid API key (>= 20 chars) is required for synthesis')
    err.type = 'SYNTHESIS_INPUT_ERROR'
    throw err
  }

  const steps = Array.isArray(analysis.steps) ? analysis.steps : []

  const getContent = (id) => {
    const step = steps.find(s => s.id === id)
    return step?.result?.content || ''
  }

  const context = {
    jtbd: getContent('jtbd'),
    designThinking: getContent('designThinking'),
    leanCanvas: getContent('leanCanvas'),
    rootCause: getContent('rootCause'),
    ost: getContent('ost')
  }

  const prompt = buildSynthesisPrompt(context)

  const result = await llmService.analyze(prompt, {
    provider: session.apiConfig.provider,
    model: session.apiConfig.model,
    apiKey,
    timeoutMs: options.timeoutMs,
    metadata: {
      sessionId: session.id,
      kind: 'synthesis'
    }
  })

  const summaryText = typeof result.content === 'string'
    ? result.content
    : ''

  if (!session.results.summary) {
    session.results.summary = {}
  }

  session.results.summary.text = summaryText
  session.results.summary.generatedAt = new Date().toISOString()
  session.results.summary.provider = session.apiConfig.provider
  session.results.summary.model = session.apiConfig.model

  if (typeof session.save === 'function') {
    await session.save()
  }

  return { summaryText }
}

