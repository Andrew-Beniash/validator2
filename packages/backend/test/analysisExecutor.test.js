import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { runAnalysis } from '../src/analysisExecutor.js'
import { createInitialAnalysisState } from '../src/validators/analysisValidator.js'
import { METHODOLOGY_STEPS } from '../src/promptTemplates.js'
import llmService from '../src/llmService.js'

describe('analysisExecutor.runAnalysis', () => {
  let originalAnalyze

  beforeEach(() => {
    originalAnalyze = llmService.analyze
  })

  afterEach(() => {
    llmService.analyze = originalAnalyze
  })

  test('runs all methodologies sequentially and stores results', async () => {
    const calls = []

    llmService.analyze = async (prompt, options) => {
      calls.push(options.metadata.stepId)
      return {
        content: `Result for ${options.metadata.stepId}`,
        provider: options.provider,
        model: options.model
      }
    }

    const session = {
      id: 'session-1',
      inputs: {
        validationRequest: {
          description: 'A'.repeat(500),
          location: 'Test Location',
          targetCustomer: 'Test Customer segment description long enough',
          teamSize: '4-10'
        }
      },
      apiConfig: {
        provider: 'openai',
        model: 'gpt-4'
      },
      results: {
        analysis: createInitialAnalysisState()
      },
      saves: 0,
      async save() {
        this.saves += 1
      }
    }

    const apiKey = 'x'.repeat(40)

    const analysis = await runAnalysis(session, apiKey)

    // Called once per methodology in correct order
    assert.deepStrictEqual(calls, METHODOLOGY_STEPS.map(s => s.id))

    // All steps completed with results
    analysis.steps.forEach(step => {
      assert.strictEqual(step.status, 'completed')
      assert.ok(step.result)
      assert.ok(step.result.content.includes(step.id))
    })

    assert.strictEqual(analysis.status, 'completed')
    assert.ok(analysis.startedAt)
    assert.ok(analysis.completedAt)
    assert.ok(session.saves > 0)
  })

  test('skips already completed steps (resume behavior)', async () => {
    const calls = []

    llmService.analyze = async (prompt, options) => {
      calls.push(options.metadata.stepId)
      return {
        content: `Result for ${options.metadata.stepId}`,
        provider: options.provider,
        model: options.model
      }
    }

    const analysis = createInitialAnalysisState()
    // Mark first two steps as completed
    analysis.steps[0].status = 'completed'
    analysis.steps[0].result = { content: 'Existing 1' }
    analysis.steps[1].status = 'completed'
    analysis.steps[1].result = { content: 'Existing 2' }
    analysis.status = 'in-progress'

    const session = {
      id: 'session-2',
      inputs: {
        validationRequest: {
          description: 'B'.repeat(500),
          location: 'Loc',
          targetCustomer: 'Target customer long description',
          teamSize: '1-3'
        }
      },
      apiConfig: {
        provider: 'openai',
        model: 'gpt-4'
      },
      results: { analysis },
      async save() {}
    }

    const apiKey = 'y'.repeat(40)

    const updated = await runAnalysis(session, apiKey)

    // Only remaining three methodologies should be called
    const expectedRemaining = METHODOLOGY_STEPS.slice(2).map(s => s.id)
    assert.deepStrictEqual(calls, expectedRemaining)

    updated.steps.forEach(step => {
      assert.strictEqual(step.status, 'completed')
      assert.ok(step.result)
    })
  })

  test('sets analysis to failed when a step throws', async () => {
    const analysis = createInitialAnalysisState()

    let callCount = 0
    llmService.analyze = async () => {
      callCount += 1
      if (callCount === 2) {
        const err = new Error('Step failure')
        err.type = 'LLM_PROVIDER_ERROR'
        throw err
      }
      return { content: 'ok', provider: 'openai', model: 'gpt-4' }
    }

    const session = {
      id: 'session-3',
      inputs: {
        validationRequest: {
          description: 'C'.repeat(500),
          location: 'Loc',
          targetCustomer: 'Target customer long description',
          teamSize: '1-3'
        }
      },
      apiConfig: {
        provider: 'openai',
        model: 'gpt-4'
      },
      results: { analysis },
      async save() {}
    }

    const apiKey = 'z'.repeat(40)

    await assert.rejects(
      () => runAnalysis(session, apiKey),
      err => err.message === 'Step failure'
    )

    assert.strictEqual(analysis.status, 'failed')
    // First step should have completed, second failed, rest pending
    assert.strictEqual(analysis.steps[0].status, 'completed')
    assert.strictEqual(analysis.steps[1].status, 'failed')
    for (let i = 2; i < analysis.steps.length; i++) {
      assert.strictEqual(analysis.steps[i].status, 'pending')
    }
  })
})

