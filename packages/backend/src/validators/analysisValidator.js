/**
 * Validation utilities for analysis initialization endpoint
 * Provides server-side validation for all form fields
 */

import { METHODOLOGY_STEPS } from '../promptTemplates.js'

const ALLOWED_MODELS = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
}

const VALID_TEAM_SIZES = ['1-3', '4-10', '11-50', '51-200', '200+']

/**
 * Validates email format using regex
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates the complete analysis initialization payload
 * @param {Object} payload - The request payload
 * @returns {Object} - { success: boolean, error?: string, details?: Object }
 */
export function validateAnalysisPayload(payload) {
  const errors = {}

  // Validate problem.description
  if (!payload?.problem?.description) {
    errors['problem.description'] = 'Problem description is required'
  } else if (typeof payload.problem.description !== 'string') {
    errors['problem.description'] = 'Problem description must be a string'
  } else if (payload.problem.description.length < 500) {
    errors['problem.description'] = 'Problem description must be at least 500 characters'
  } else if (payload.problem.description.length > 2000) {
    errors['problem.description'] = 'Problem description must not exceed 2000 characters'
  }

  // Validate clarification.location
  if (!payload?.clarification?.location) {
    errors['clarification.location'] = 'Location is required'
  } else if (typeof payload.clarification.location !== 'string') {
    errors['clarification.location'] = 'Location must be a string'
  } else if (payload.clarification.location.trim().length < 3) {
    errors['clarification.location'] = 'Location must be at least 3 characters'
  }

  // Validate clarification.targetCustomer
  if (!payload?.clarification?.targetCustomer) {
    errors['clarification.targetCustomer'] = 'Target customer description is required'
  } else if (typeof payload.clarification.targetCustomer !== 'string') {
    errors['clarification.targetCustomer'] = 'Target customer must be a string'
  } else if (payload.clarification.targetCustomer.trim().length < 20) {
    errors['clarification.targetCustomer'] = 'Target customer description must be at least 20 characters'
  }

  // Validate clarification.teamSize
  if (!payload?.clarification?.teamSize) {
    errors['clarification.teamSize'] = 'Team size is required'
  } else if (typeof payload.clarification.teamSize !== 'string') {
    errors['clarification.teamSize'] = 'Team size must be a string'
  } else if (!VALID_TEAM_SIZES.includes(payload.clarification.teamSize)) {
    // Also check if it's a positive integer
    const asNumber = parseInt(payload.clarification.teamSize, 10)
    if (isNaN(asNumber) || asNumber <= 0) {
      errors['clarification.teamSize'] = `Team size must be one of: ${VALID_TEAM_SIZES.join(', ')} or a positive integer`
    }
  }

  // Validate config.email
  if (!payload?.config?.email) {
    errors['config.email'] = 'Email address is required'
  } else if (typeof payload.config.email !== 'string') {
    errors['config.email'] = 'Email must be a string'
  } else if (!isValidEmail(payload.config.email)) {
    errors['config.email'] = 'Invalid email address format'
  }

  // Validate config.provider
  if (!payload?.config?.provider) {
    errors['config.provider'] = 'AI provider is required'
  } else if (!['openai', 'claude'].includes(payload.config.provider)) {
    errors['config.provider'] = 'Provider must be either "openai" or "claude"'
  }

  // Validate config.model
  if (!payload?.config?.model) {
    errors['config.model'] = 'Model selection is required'
  } else if (payload.config.provider && ALLOWED_MODELS[payload.config.provider]) {
    if (!ALLOWED_MODELS[payload.config.provider].includes(payload.config.model)) {
      errors['config.model'] = `Model must be one of: ${ALLOWED_MODELS[payload.config.provider].join(', ')}`
    }
  }

  // Validate config.apiKey
  if (!payload?.config?.apiKey) {
    errors['config.apiKey'] = 'API key is required'
  } else if (typeof payload.config.apiKey !== 'string') {
    errors['config.apiKey'] = 'API key must be a string'
  } else if (payload.config.apiKey.length < 20) {
    errors['config.apiKey'] = 'API key must be at least 20 characters'
  }

  // Return validation result
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      error: 'Validation failed',
      details: errors
    }
  }

  return { success: true }
}

/**
 * Creates the initial analysis state structure
 * Uses METHODOLOGY_STEPS as single source of truth for step names
 */
export function createInitialAnalysisState() {
  return {
    status: 'pending',
    startedAt: null,
    completedAt: null,
    steps: METHODOLOGY_STEPS.map(step => ({
      id: step.id,
      name: step.name,
      status: 'pending',
      result: null
    })),
    error: null
  }
}
