import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import llmService from '../src/llmService.js'

// Preserve original fetch
const realFetch = global.fetch

describe('llmService', () => {
  beforeEach(() => {
    global.fetch = async () => {
      throw new Error('fetch not mocked')
    }
  })

  afterEach(() => {
    global.fetch = realFetch
  })

  test('throws on invalid inputs', async () => {
    await assert.rejects(
      () => llmService.analyze('', { provider: 'openai', model: 'gpt-4', apiKey: 'x'.repeat(20) }),
      err => err.type === 'LLM_INPUT_ERROR'
    )

    await assert.rejects(
      () => llmService.analyze('prompt', { provider: 'invalid', model: 'gpt-4', apiKey: 'x'.repeat(20) }),
      err => err.type === 'LLM_INPUT_ERROR'
    )
  })

  test('calls OpenAI with correct payload and normalizes response', async () => {
    const fakeResponse = {
      choices: [
        {
          message: {
            content: 'OpenAI response text'
          }
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    }

    let receivedUrl
    let receivedInit

    global.fetch = async (url, init) => {
      receivedUrl = url
      receivedInit = init
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify(fakeResponse)
        }
      }
    }

    const apiKey = 'x'.repeat(40)
    const result = await llmService.analyze('test prompt', {
      provider: 'openai',
      model: 'gpt-4',
      apiKey
    })

    assert.ok(receivedUrl.includes('/chat/completions'))
    assert.strictEqual(receivedInit.method, 'POST')
    assert.strictEqual(receivedInit.headers.Authorization, `Bearer ${apiKey}`)

    const body = JSON.parse(receivedInit.body)
    assert.strictEqual(body.model, 'gpt-4')
    assert.strictEqual(body.messages[1].content, 'test prompt')

    assert.strictEqual(result.provider, 'openai')
    assert.strictEqual(result.model, 'gpt-4')
    assert.strictEqual(result.content, 'OpenAI response text')
    assert.deepStrictEqual(result.usage, {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30
    })
  })

  test('calls Claude with correct payload and normalizes response', async () => {
    const fakeResponse = {
      content: [
        {
          type: 'text',
          text: 'Claude response text'
        }
      ],
      usage: {
        input_tokens: 5,
        output_tokens: 15
      }
    }

    let receivedUrl
    let receivedInit

    global.fetch = async (url, init) => {
      receivedUrl = url
      receivedInit = init
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify(fakeResponse)
        }
      }
    }

    const apiKey = 'y'.repeat(40)
    const result = await llmService.analyze('test prompt', {
      provider: 'claude',
      model: 'claude-3-sonnet',
      apiKey
    })

    assert.ok(receivedUrl.includes('/messages'))
    assert.strictEqual(receivedInit.method, 'POST')
    assert.strictEqual(receivedInit.headers['x-api-key'], apiKey)

    const body = JSON.parse(receivedInit.body)
    assert.strictEqual(body.model, 'claude-3-sonnet')
    assert.strictEqual(
      body.messages[0].content[0].text,
      'test prompt'
    )

    assert.strictEqual(result.provider, 'claude')
    assert.strictEqual(result.model, 'claude-3-sonnet')
    assert.strictEqual(result.content, 'Claude response text')
    assert.deepStrictEqual(result.usage, {
      promptTokens: 5,
      completionTokens: 15,
      totalTokens: 20
    })
  })

  test('handles provider error responses', async () => {
    const errorBody = {
      error: {
        message: 'Bad request',
        code: 'invalid_request'
      }
    }

    global.fetch = async () => ({
      ok: false,
      status: 400,
      async text() {
        return JSON.stringify(errorBody)
      }
    })

    await assert.rejects(
      () =>
        llmService.analyze('test prompt', {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'z'.repeat(40)
        }),
      err => err.type === 'LLM_PROVIDER_ERROR' && err.status === 400
    )
  })

  test('handles network errors as LLM_NETWORK_ERROR', async () => {
    global.fetch = async () => {
      const error = new Error('network fail')
      error.code = 'ECONNRESET'
      throw error
    }

    await assert.rejects(
      () =>
        llmService.analyze('test prompt', {
          provider: 'claude',
          model: 'claude-3-opus',
          apiKey: 'z'.repeat(40)
        }),
      err => err.type === 'LLM_NETWORK_ERROR'
    )
  })
})

