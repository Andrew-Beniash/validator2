/**
 * SIT (Systematic Inventive Thinking) Ideation Service
 * Executes the five SIT tools to generate constraint-driven solution ideas
 */

import llmService from './llmService.js'
import {
  SIT_TOOLS,
  generateSitToolPrompt,
  generateSitSynthesisPrompt,
  SIT_EXECUTION_CONFIG
} from './sitPromptTemplates.js'

/**
 * Execute SIT for a single tool
 * @param {Object} tool - SIT tool configuration
 * @param {Object} problemContext - Problem description and context
 * @param {Object} systemContext - Existing system context from analysis
 * @param {Object} apiConfig - LLM API configuration
 * @returns {Promise<Array>} Array of solution ideas
 */
async function executeTool(tool, problemContext, systemContext, apiConfig) {
  const prompt = generateSitToolPrompt(tool, problemContext, systemContext)

  try {
    const response = await llmService.analyze(prompt, {
      provider: apiConfig.provider,
      model: apiConfig.model,
      apiKey: apiConfig.apiKey,
      timeoutMs: SIT_EXECUTION_CONFIG.timeoutPerTool,
      metadata: {
        technique: 'sit',
        tool: tool.id
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

    // Validate structure based on tool type
    ideas.forEach((idea, index) => {
      if (!idea.title || !idea.description || !idea.benefits || !idea.rationale) {
        throw new Error(`Idea ${index + 1} missing required base fields`)
      }
    })

    return ideas
  } catch (error) {
    console.error(`Error executing SIT tool "${tool.name}":`, error)

    // Return structured error for this tool
    return {
      error: true,
      tool: tool.id,
      message: error.message || 'Failed to generate ideas for this tool'
    }
  }
}

/**
 * Execute synthesis and ranking of all SIT ideas
 * @param {Object} allIdeas - Ideas organized by tool ID
 * @param {Object} problemContext - Problem description and context
 * @param {Object} apiConfig - LLM API configuration
 * @returns {Promise<Object>} Synthesis with comparative analysis and top concepts
 */
async function executeSynthesis(allIdeas, problemContext, apiConfig) {
  const prompt = generateSitSynthesisPrompt(allIdeas, problemContext)

  try {
    const response = await llmService.analyze(prompt, {
      provider: apiConfig.provider,
      model: apiConfig.model,
      apiKey: apiConfig.apiKey,
      timeoutMs: SIT_EXECUTION_CONFIG.timeoutPerTool,
      metadata: {
        technique: 'sit',
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

    if (!synthesis.comparativeAnalysis || !synthesis.topConcepts || !synthesis.constraintAlignment) {
      throw new Error('Synthesis missing required fields')
    }

    return synthesis
  } catch (error) {
    console.error('Error executing SIT synthesis:', error)
    throw error
  }
}

/**
 * Execute full SIT analysis
 * @param {Object} session - Express session object
 * @param {string} apiKey - LLM API key (in-memory, not persisted)
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} Complete SIT results
 */
export async function executeSit(session, apiKey, progressCallback = null) {
  // Validate prerequisites
  if (!session?.inputs?.validationRequest?.description) {
    throw new Error('Problem description not found in session')
  }

  if (!session?.apiConfig?.provider || !session?.apiConfig?.model) {
    throw new Error('API configuration not found in session')
  }

  // Validate that analysis is completed
  if (session?.results?.analysis?.status !== 'completed') {
    throw new Error('Problem validation analysis must be completed before running SIT ideation')
  }

  // Prepare problem context
  const problemContext = {
    description: session.inputs.validationRequest.description,
    location: session.inputs.clarification?.location,
    targetCustomer: session.inputs.clarification?.targetCustomer,
    teamSize: session.inputs.clarification?.teamSize
  }

  // Prepare system context from analysis results
  const systemContext = {
    summary: session.results.summary?.text || '',
    constraints: buildConstraintsText(session)
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
    tools: {},
    synthesis: null,
    completedAt: null
  }

  session.results.ideation.sit = results

  // Execute each SIT tool sequentially
  for (let i = 0; i < SIT_TOOLS.length; i++) {
    const tool = SIT_TOOLS[i]

    // Progress callback
    if (progressCallback) {
      progressCallback({
        currentStep: i + 1,
        totalSteps: SIT_TOOLS.length + 1, // +1 for synthesis
        currentTool: tool.name,
        status: 'in-progress'
      })
    }

    try {
      const ideas = await executeTool(tool, problemContext, systemContext, apiConfig)
      results.tools[tool.id] = {
        name: tool.name,
        description: tool.description,
        ideas: ideas.error ? [] : ideas,
        error: ideas.error ? ideas.message : null,
        executedAt: new Date().toISOString()
      }
    } catch (error) {
      results.tools[tool.id] = {
        name: tool.name,
        description: tool.description,
        ideas: [],
        error: error.message,
        executedAt: new Date().toISOString()
      }
    }

    // Update session
    session.results.ideation.sit = results
  }

  // Execute synthesis
  if (progressCallback) {
    progressCallback({
      currentStep: SIT_TOOLS.length + 1,
      totalSteps: SIT_TOOLS.length + 1,
      currentTool: 'Synthesis & Ranking',
      status: 'in-progress'
    })
  }

  try {
    const synthesis = await executeSynthesis(results.tools, problemContext, apiConfig)
    results.synthesis = synthesis
    results.status = 'completed'
  } catch (error) {
    console.error('SIT synthesis failed:', error)
    results.synthesis = {
      error: true,
      message: 'Failed to synthesize and rank ideas'
    }
    results.status = 'completed-with-errors'
  }

  results.completedAt = new Date().toISOString()
  session.results.ideation.sit = results

  // Final progress callback
  if (progressCallback) {
    progressCallback({
      currentStep: SIT_TOOLS.length + 1,
      totalSteps: SIT_TOOLS.length + 1,
      currentTool: 'Complete',
      status: 'completed'
    })
  }

  return results
}

/**
 * Build constraints text from session data
 * @param {Object} session - Express session
 * @returns {string} Constraints description
 */
function buildConstraintsText(session) {
  const constraints = []

  // Team size constraint
  if (session.inputs.clarification?.teamSize) {
    constraints.push(`- Team: ${session.inputs.clarification.teamSize}`)
  }

  // Technology constraints from API config
  if (session.apiConfig?.provider && session.apiConfig?.model) {
    constraints.push(`- Using ${session.apiConfig.provider} (${session.apiConfig.model}) for analysis`)
  }

  // Budget/resource constraints implied by problem context
  if (session.inputs.validationRequest?.description) {
    const desc = session.inputs.validationRequest.description.toLowerCase()
    if (desc.includes('budget') || desc.includes('cost') || desc.includes('expensive')) {
      constraints.push('- Budget/cost constraints mentioned in problem description')
    }
    if (desc.includes('time') || desc.includes('deadline') || desc.includes('quickly')) {
      constraints.push('- Time constraints mentioned in problem description')
    }
  }

  // Add summary of validation findings as implicit constraints
  if (session.results.summary?.text) {
    constraints.push('- Must address findings from validation analysis')
  }

  return constraints.length > 0 ? constraints.join('\n') : '- Work within current team and resource constraints'
}

export default {
  executeSit,
  SIT_TOOLS,
  SIT_EXECUTION_CONFIG
}
