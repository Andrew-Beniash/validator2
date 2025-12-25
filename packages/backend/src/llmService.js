/**
 * LLM Service - Provider-agnostic integration layer for OpenAI and Claude
 *
 * Exposes a single analyze(prompt, options) method that:
 * - Validates input
 * - Routes requests to the correct provider
 * - Normalizes responses into a common shape
 * - Provides structured error objects for callers
 */

const DEFAULT_TIMEOUT_MS = parseInt(process.env.LLM_REQUEST_TIMEOUT_MS, 10) || 60000

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const CLAUDE_BASE_URL = process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1'
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID

// Anthropic / Claude API version – update if provider requirements change
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01'

/**
 * Execute a fetch request with timeout support.
 * Uses AbortController to cancel the request if it exceeds timeoutMs.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } catch (error) {
    // Re-throw; caller will wrap into a structured error
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Normalize OpenAI chat completion response
 * @param {any} data
 */
function normalizeOpenAIResponse(data, model) {
  try {
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      ''

    if (!content || typeof content !== 'string') {
      const err = new Error('Unable to parse OpenAI response content')
      err.type = 'LLM_PARSE_ERROR'
      err.provider = 'openai'
      err.model = model
      throw err
    }

    const usageSource = data?.usage
    const usage = usageSource
      ? {
          promptTokens: usageSafeNumber(usageSource.prompt_tokens),
          completionTokens: usageSafeNumber(usageSource.completion_tokens),
          totalTokens: usageSafeNumber(usageSource.total_tokens)
        }
      : undefined

    return {
      content,
      provider: 'openai',
      model,
      usage,
      raw: data
    }
  } catch (error) {
    if (error.type === 'LLM_PARSE_ERROR') {
      throw error
    }
    const err = new Error('Failed to normalize OpenAI response')
    err.type = 'LLM_PARSE_ERROR'
    err.provider = 'openai'
    err.model = model
    err.cause = error
    throw err
  }
}

/**
 * Normalize Claude (Anthropic) messages response
 * @param {any} data
 */
function normalizeClaudeResponse(data, model) {
  try {
    // Claude Messages API: content is an array of blocks, pick first text block
    const firstBlock = Array.isArray(data?.content) ? data.content[0] : null
    const content = typeof firstBlock?.text === 'string' ? firstBlock.text : ''

    if (!content) {
      const err = new Error('Unable to parse Claude response content')
      err.type = 'LLM_PARSE_ERROR'
      err.provider = 'claude'
      err.model = model
      throw err
    }

    // Usage object may vary; normalize if present
    const usageSource = data?.usage
    const usage = usageSource
      ? {
          promptTokens: usageSafeNumber(
            usageSource.input_tokens ?? usageSource.prompt_tokens
          ),
          completionTokens: usageSafeNumber(
            usageSource.output_tokens ?? usageSource.completion_tokens
          ),
          totalTokens: usageSafeNumber(
            usageSource.total_tokens ??
              (usageSource.input_tokens != null &&
              usageSource.output_tokens != null
                ? usageSource.input_tokens + usageSource.output_tokens
                : undefined)
          )
        }
      : undefined

    return {
      content,
      provider: 'claude',
      model,
      usage,
      raw: data
    }
  } catch (error) {
    if (error.type === 'LLM_PARSE_ERROR') {
      throw error
    }
    const err = new Error('Failed to normalize Claude response')
    err.type = 'LLM_PARSE_ERROR'
    err.provider = 'claude'
    err.model = model
    err.cause = error
    throw err
  }
}

function usageSafeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Call OpenAI Chat Completions API
 * @param {string} prompt
 * @param {AnalyzeOptions} options
 */
async function callOpenAI(prompt, options) {
  const url = `${OPENAI_BASE_URL}/chat/completions`

  const body = {
    model: options.model,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert product strategy and problem validation assistant.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${options.apiKey}`
  }

  if (OPENAI_ORG_ID) {
    headers['OpenAI-Organization'] = OPENAI_ORG_ID
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS

  let response
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      },
      timeoutMs
    )
  } catch (error) {
    const err = new Error('Failed to reach OpenAI API')
    err.type = 'LLM_NETWORK_ERROR'
    err.provider = 'openai'
    err.model = options.model
    err.cause = error
    throw err
  }

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch (error) {
    const err = new Error('Invalid JSON response from OpenAI')
    err.type = 'LLM_PARSE_ERROR'
    err.provider = 'openai'
    err.model = options.model
    err.cause = error
    throw err
  }

  if (!response.ok) {
    const err = new Error(
      data?.error?.message || 'OpenAI API returned an error'
    )
    err.type = 'LLM_PROVIDER_ERROR'
    err.provider = 'openai'
    err.model = options.model
    err.status = response.status
    err.code = data?.error?.code || data?.error?.type
    throw err
  }

  return normalizeOpenAIResponse(data, options.model)
}

/**
 * Call Claude (Anthropic) Messages API
 * @param {string} prompt
 * @param {AnalyzeOptions} options
 */
async function callClaude(prompt, options) {
  const url = `${CLAUDE_BASE_URL}/messages`

  const body = {
    model: options.model,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': options.apiKey,
    'anthropic-version': ANTHROPIC_VERSION
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS

  let response
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      },
      timeoutMs
    )
  } catch (error) {
    const err = new Error('Failed to reach Claude API')
    err.type = 'LLM_NETWORK_ERROR'
    err.provider = 'claude'
    err.model = options.model
    err.cause = error
    throw err
  }

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch (error) {
    const err = new Error('Invalid JSON response from Claude')
    err.type = 'LLM_PARSE_ERROR'
    err.provider = 'claude'
    err.model = options.model
    err.cause = error
    throw err
  }

  if (!response.ok) {
    const err = new Error(
      data?.error?.message || 'Claude API returned an error'
    )
    err.type = 'LLM_PROVIDER_ERROR'
    err.provider = 'claude'
    err.model = options.model
    err.status = response.status
    err.code = data?.error?.code || data?.error?.type
    throw err
  }

  return normalizeClaudeResponse(data, options.model)
}

/**
 * Main LLM service object
 */
const llmService = {
  /**
   * Analyze a prompt using the configured provider and model.
   * @param {string} prompt
   * @param {Object} options
   * @returns {Promise<{content: string, provider: string, model: string, usage?: Object, raw?: unknown}>}
   */
  async analyze(prompt, options) {
    if (!prompt || typeof prompt !== 'string') {
      const err = new Error('Prompt must be a non-empty string')
      err.type = 'LLM_INPUT_ERROR'
      throw err
    }

    if (!options || typeof options !== 'object') {
      const err = new Error('Options must be provided')
      err.type = 'LLM_INPUT_ERROR'
      throw err
    }

    const { provider, model, apiKey } = options

    if (!provider || !['openai', 'claude'].includes(provider)) {
      const err = new Error('Provider must be either "openai" or "claude"')
      err.type = 'LLM_INPUT_ERROR'
      throw err
    }

    if (!model || typeof model !== 'string') {
      const err = new Error('Model must be a non-empty string')
      err.type = 'LLM_INPUT_ERROR'
      throw err
    }

    if (!apiKey || typeof apiKey !== 'string') {
      const err = new Error('API key must be a non-empty string')
      err.type = 'LLM_INPUT_ERROR'
      throw err
    }

    const safePromptLength = prompt.length
    const metaInfo = options.metadata || {}

    try {
      if (provider === 'openai') {
        return await callOpenAI(prompt, options)
      }
      return await callClaude(prompt, options)
    } catch (error) {
      // Log high-level information without leaking secrets
      const logPayload = {
        type: error.type || 'LLM_UNKNOWN_ERROR',
        provider,
        model,
        status: error.status,
        code: error.code,
        message: error.message,
        promptLength: safePromptLength,
        metadata: metaInfo
      }

      // eslint-disable-next-line no-console
      console.error('LLM error:', logPayload)

      throw error
    }
  }
}

export default llmService
