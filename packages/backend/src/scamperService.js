/**
 * SCAMPER Ideation Service
 * Executes the SCAMPER technique to generate solution variations
 */

import llmService from './llmService.js'
import {
  SCAMPER_LENSES,
  generateScamperLensPrompt,
  generateScamperSynthesisPrompt,
  SCAMPER_EXECUTION_CONFIG
} from './scamperPromptTemplates.js'

/**
 * Execute SCAMPER for a single lens
 * @param {Object} lens - SCAMPER lens configuration
 * @param {Object} problemContext - Problem description and context
 * @param {Object} apiConfig - LLM API configuration
 * @returns {Promise<Array>} Array of solution variations
 */
async function executeLens(lens, problemContext, apiConfig) {
  const prompt = generateScamperLensPrompt(lens, problemContext)

  try {
    const response = await llmService.analyze(prompt, {
      provider: apiConfig.provider,
      model: apiConfig.model,
      apiKey: apiConfig.apiKey,
      timeoutMs: SCAMPER_EXECUTION_CONFIG.timeoutPerLens,
      metadata: {
        technique: 'scamper',
        lens: lens.id
      }
    })

    // Parse JSON response
    const content = response.content.trim()

    // Handle potential markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.match(/```\n?([\s\S]*?)\n?```/)
    const jsonText = jsonMatch ? jsonMatch[1] : content

    const ideas = JSON.parse(jsonText)

    if (!Array.isArray(ideas)) {
      throw new Error('LLM did not return an array of ideas')
    }

    // Validate structure
    ideas.forEach((idea, index) => {
      if (!idea.title || !idea.description || !idea.problemConnection) {
        throw new Error(`Idea ${index + 1} missing required fields`)
      }
    })

    return ideas
  } catch (error) {
    console.error(`Error executing SCAMPER lens "${lens.name}":`, error)

    // Return structured error for this lens
    return {
      error: true,
      lens: lens.id,
      message: error.message || 'Failed to generate ideas for this lens'
    }
  }
}

/**
 * Execute synthesis and ranking of all SCAMPER ideas
 * @param {Object} allIdeas - Ideas organized by lens ID
 * @param {Object} problemContext - Problem description and context
 * @param {Object} apiConfig - LLM API configuration
 * @returns {Promise<Object>} Synthesis with comparative analysis and top concepts
 */
async function executeSynthesis(allIdeas, problemContext, apiConfig) {
  const prompt = generateScamperSynthesisPrompt(allIdeas, problemContext)

  try {
    const response = await llmService.analyze(prompt, {
      provider: apiConfig.provider,
      model: apiConfig.model,
      apiKey: apiConfig.apiKey,
      timeoutMs: SCAMPER_EXECUTION_CONFIG.timeoutPerLens,
      metadata: {
        technique: 'scamper',
        step: 'synthesis'
      }
    })

    // Parse JSON response
    const content = response.content.trim()

    // Handle potential markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.match(/```\n?([\s\S]*?)\n?```/)
    const jsonText = jsonMatch ? jsonMatch[1] : content

    const synthesis = JSON.parse(jsonText)

    if (!synthesis.comparativeAnalysis || !synthesis.topConcepts) {
      throw new Error('Synthesis missing required fields')
    }

    return synthesis
  } catch (error) {
    console.error('Error executing SCAMPER synthesis:', error)
    throw error
  }
}

/**
 * Execute full SCAMPER analysis
 * @param {Object} session - Express session object
 * @param {string} apiKey - LLM API key (in-memory, not persisted)
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} Complete SCAMPER results
 */
export async function executeScamper(session, apiKey, progressCallback = null) {
  // Validate prerequisites
  if (!session?.inputs?.validationRequest?.description) {
    throw new Error('Problem description not found in session')
  }

  if (!session?.apiConfig?.provider || !session?.apiConfig?.model) {
    throw new Error('API configuration not found in session')
  }

  // Prepare problem context
  const problemContext = {
    description: session.inputs.validationRequest.description,
    location: session.inputs.clarification?.location,
    targetCustomer: session.inputs.clarification?.targetCustomer,
    teamSize: session.inputs.clarification?.teamSize
  }

  const apiConfig = {
    provider: session.apiConfig.provider,
    model: session.apiConfig.model,
    apiKey
  }

  // Initialize results structure
  if (!session.results) {
    session.results = {}
  }
  if (!session.results.ideation) {
    session.results.ideation = {}
  }

  const results = {
    status: 'in-progress',
    startedAt: new Date().toISOString(),
    lenses: {},
    synthesis: null,
    completedAt: null
  }

  session.results.ideation.scamper = results

  // Execute each SCAMPER lens sequentially
  for (let i = 0; i < SCAMPER_LENSES.length; i++) {
    const lens = SCAMPER_LENSES[i]

    // Progress callback
    if (progressCallback) {
      progressCallback({
        currentStep: i + 1,
        totalSteps: SCAMPER_LENSES.length + 1, // +1 for synthesis
        currentLens: lens.name,
        status: 'in-progress'
      })
    }

    try {
      const ideas = await executeLens(lens, problemContext, apiConfig)
      results.lenses[lens.id] = {
        name: lens.name,
        description: lens.description,
        ideas: ideas.error ? [] : ideas,
        error: ideas.error ? ideas.message : null,
        executedAt: new Date().toISOString()
      }
    } catch (error) {
      results.lenses[lens.id] = {
        name: lens.name,
        description: lens.description,
        ideas: [],
        error: error.message,
        executedAt: new Date().toISOString()
      }
    }

    // Update session
    session.results.ideation.scamper = results
  }

  // Execute synthesis
  if (progressCallback) {
    progressCallback({
      currentStep: SCAMPER_LENSES.length + 1,
      totalSteps: SCAMPER_LENSES.length + 1,
      currentLens: 'Synthesis & Ranking',
      status: 'in-progress'
    })
  }

  try {
    const synthesis = await executeSynthesis(results.lenses, problemContext, apiConfig)
    results.synthesis = synthesis
    results.status = 'completed'
  } catch (error) {
    console.error('SCAMPER synthesis failed:', error)
    results.synthesis = {
      error: true,
      message: 'Failed to synthesize and rank ideas'
    }
    results.status = 'completed-with-errors'
  }

  results.completedAt = new Date().toISOString()
  session.results.ideation.scamper = results

  // Final progress callback
  if (progressCallback) {
    progressCallback({
      currentStep: SCAMPER_LENSES.length + 1,
      totalSteps: SCAMPER_LENSES.length + 1,
      currentLens: 'Complete',
      status: 'completed'
    })
  }

  return results
}

export default {
  executeScamper,
  SCAMPER_LENSES,
  SCAMPER_EXECUTION_CONFIG
}
