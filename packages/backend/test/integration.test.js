/**
 * Integration tests for prompt templates with analysis validator
 * Tests that the modules work together correctly
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { METHODOLOGY_STEPS } from '../src/promptTemplates.js'
import { createInitialAnalysisState } from '../src/validators/analysisValidator.js'

test('Integration: createInitialAnalysisState should use METHODOLOGY_STEPS', () => {
  const analysisState = createInitialAnalysisState()

  // Should have correct structure
  assert.ok(analysisState.status)
  assert.ok(Array.isArray(analysisState.steps))
  assert.strictEqual(analysisState.steps.length, 5)

  // Steps should match METHODOLOGY_STEPS
  analysisState.steps.forEach((step, index) => {
    const expectedStep = METHODOLOGY_STEPS[index]
    assert.strictEqual(step.id, expectedStep.id, `Step ${index} id should match`)
    assert.strictEqual(step.name, expectedStep.name, `Step ${index} name should match`)
    assert.strictEqual(step.status, 'pending')
    assert.strictEqual(step.result, null)
  })
})

test('Integration: analysis state steps have correct IDs for prompt building', () => {
  const analysisState = createInitialAnalysisState()

  // All step IDs should be valid for buildPrompt
  const validIds = METHODOLOGY_STEPS.map(s => s.id)

  analysisState.steps.forEach(step => {
    assert.ok(validIds.includes(step.id), `Step ID ${step.id} should be valid for buildPrompt`)
  })
})

test('Integration: step order matches between modules', () => {
  const analysisState = createInitialAnalysisState()

  const expectedOrder = ['jtbd', 'designThinking', 'leanCanvas', 'rootCause', 'ost']
  const actualOrder = analysisState.steps.map(s => s.id)

  assert.deepStrictEqual(actualOrder, expectedOrder)
})
