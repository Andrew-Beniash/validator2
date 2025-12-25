import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { generateSynthesisSummary } from '../src/synthesisService.js'
import llmService from '../src/llmService.js'

describe('synthesisService.generateSynthesisSummary', () => {
  let originalAnalyze

  beforeEach(() => {
    originalAnalyze = llmService.analyze
  })

  afterEach(() => {
    llmService.analyze = originalAnalyze
  })

  test('builds synthesis prompt from all five methods and stores summary', async () => {
    const contents = {
      jtbd: 'JTBD content',
      designThinking: 'Design Thinking content',
      leanCanvas: 'Lean Canvas content',
      rootCause: 'Root Cause content',
      ost: 'OST content'
    }

    let receivedPrompt = null

    llmService.analyze = async (prompt) => {
      receivedPrompt = prompt
      return {
        content: 'Synthesized summary text',
        provider: 'openai',
        model: 'gpt-4'
      }
    }

    const session = {
      id: 'session-synth',
      apiConfig: {
        provider: 'openai',
        model: 'gpt-4'
      },
      results: {
        analysis: {
          status: 'completed',
          steps: [
            { id: 'jtbd', result: { content: contents.jtbd } },
            { id: 'designThinking', result: { content: contents.designThinking } },
            { id: 'leanCanvas', result: { content: contents.leanCanvas } },
            { id: 'rootCause', result: { content: contents.rootCause } },
            { id: 'ost', result: { content: contents.ost } }
          ]
        },
        summary: null
      },
      async save() {}
    }

    const apiKey = 'x'.repeat(40)

    const result = await generateSynthesisSummary(session, apiKey)

    assert.ok(receivedPrompt)
    Object.values(contents).forEach(text => {
      assert.ok(
        receivedPrompt.includes(text),
        `Prompt should include "${text}"`
      )
    })

    assert.strictEqual(result.summaryText, 'Synthesized summary text')
    assert.ok(session.results.summary)
    assert.strictEqual(session.results.summary.text, 'Synthesized summary text')
    assert.strictEqual(session.results.summary.provider, 'openai')
    assert.strictEqual(session.results.summary.model, 'gpt-4')
    assert.ok(session.results.summary.generatedAt)
  })
})

