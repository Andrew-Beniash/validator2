/**
 * Tests for prompt template module
 */

import { test } from 'node:test'
import assert from 'node:assert'
import {
  METHODOLOGY_STEPS,
  PROMPT_TEMPLATES,
  buildPrompt,
  extractContextFromSession,
  getMethodologyStep,
  getMethodologyOrder
} from '../src/promptTemplates.js'

test('METHODOLOGY_STEPS should have 5 steps in correct order', () => {
  assert.strictEqual(METHODOLOGY_STEPS.length, 5)
  assert.strictEqual(METHODOLOGY_STEPS[0].id, 'jtbd')
  assert.strictEqual(METHODOLOGY_STEPS[1].id, 'designThinking')
  assert.strictEqual(METHODOLOGY_STEPS[2].id, 'leanCanvas')
  assert.strictEqual(METHODOLOGY_STEPS[3].id, 'rootCause')
  assert.strictEqual(METHODOLOGY_STEPS[4].id, 'ost')
})

test('METHODOLOGY_STEPS should have required metadata fields', () => {
  METHODOLOGY_STEPS.forEach(step => {
    assert.ok(step.id, 'Step should have id')
    assert.ok(step.name, 'Step should have name')
    assert.ok(step.progressLabel, 'Step should have progressLabel')
    assert.ok(step.description, 'Step should have description')
    assert.ok(step.progressLabel.includes(`(${METHODOLOGY_STEPS.indexOf(step) + 1}/5)`), 'Progress label should include step number')
  })
})

test('PROMPT_TEMPLATES should have templates for all 5 methodologies', () => {
  assert.strictEqual(Object.keys(PROMPT_TEMPLATES).length, 5)
  assert.ok(PROMPT_TEMPLATES.jtbd)
  assert.ok(PROMPT_TEMPLATES.designThinking)
  assert.ok(PROMPT_TEMPLATES.leanCanvas)
  assert.ok(PROMPT_TEMPLATES.rootCause)
  assert.ok(PROMPT_TEMPLATES.ost)
})

test('PROMPT_TEMPLATES should contain expected placeholders', () => {
  // JTBD, Design Thinking, Lean Canvas, Root Cause use PROBLEM_STATEMENT
  assert.ok(PROMPT_TEMPLATES.jtbd.includes('{{PROBLEM_STATEMENT}}'))
  assert.ok(PROMPT_TEMPLATES.designThinking.includes('{{PROBLEM_STATEMENT}}'))
  assert.ok(PROMPT_TEMPLATES.leanCanvas.includes('{{PROBLEM_STATEMENT}}'))
  assert.ok(PROMPT_TEMPLATES.rootCause.includes('{{PROBLEM_STATEMENT}}'))

  // OST uses BUSINESS_GOAL_OR_PROBLEM_STATEMENT
  assert.ok(PROMPT_TEMPLATES.ost.includes('{{BUSINESS_GOAL_OR_PROBLEM_STATEMENT}}'))

  // All should have context placeholders
  Object.values(PROMPT_TEMPLATES).forEach(template => {
    assert.ok(template.includes('{{LOCATION}}'))
    assert.ok(template.includes('{{TARGET_CUSTOMER}}'))
    assert.ok(template.includes('{{TEAM_SIZE}}'))
  })
})

test('buildPrompt should replace all placeholders with context data', () => {
  const context = {
    problemStatement: 'Low user retention in our SaaS product',
    location: 'San Francisco Bay Area',
    targetCustomer: 'Small tech startups',
    teamSize: '4-10'
  }

  const prompt = buildPrompt('jtbd', context)

  assert.ok(prompt.includes(context.problemStatement))
  assert.ok(prompt.includes(context.location))
  assert.ok(prompt.includes(context.targetCustomer))
  assert.ok(prompt.includes(context.teamSize))
  assert.ok(!prompt.includes('{{PROBLEM_STATEMENT}}'))
  assert.ok(!prompt.includes('{{LOCATION}}'))
  assert.ok(!prompt.includes('{{TARGET_CUSTOMER}}'))
  assert.ok(!prompt.includes('{{TEAM_SIZE}}'))
})

test('buildPrompt should use defaults for missing context fields', () => {
  const prompt = buildPrompt('jtbd', {})

  assert.ok(prompt.includes('not specified'))
  assert.ok(!prompt.includes('{{PROBLEM_STATEMENT}}'))
  assert.ok(!prompt.includes('{{LOCATION}}'))
})

test('buildPrompt should handle OST with businessGoalOrProblemStatement', () => {
  const context = {
    problemStatement: 'Low retention',
    businessGoalOrProblemStatement: 'Increase user engagement by 50%',
    location: 'Global',
    targetCustomer: 'SaaS companies',
    teamSize: '10-20'
  }

  const prompt = buildPrompt('ost', context)

  assert.ok(prompt.includes('Increase user engagement by 50%'))
  assert.ok(!prompt.includes('{{BUSINESS_GOAL_OR_PROBLEM_STATEMENT}}'))
})

test('buildPrompt should default OST to problemStatement if businessGoal missing', () => {
  const context = {
    problemStatement: 'Low retention problem',
    location: 'Global',
    targetCustomer: 'SaaS companies',
    teamSize: '10-20'
  }

  const prompt = buildPrompt('ost', context)

  assert.ok(prompt.includes('Low retention problem'))
})

test('buildPrompt should throw error for invalid methodology ID', () => {
  assert.throws(
    () => buildPrompt('invalidMethod', {}),
    /Invalid methodology ID/
  )
})

test('extractContextFromSession should map session data to context', () => {
  const session = {
    inputs: {
      validationRequest: {
        description: 'User retention is below 20%',
        location: 'San Francisco',
        targetCustomer: 'Tech startups',
        teamSize: '5-10'
      }
    }
  }

  const context = extractContextFromSession(session)

  assert.strictEqual(context.problemStatement, 'User retention is below 20%')
  assert.strictEqual(context.location, 'San Francisco')
  assert.strictEqual(context.targetCustomer, 'Tech startups')
  assert.strictEqual(context.teamSize, '5-10')
  assert.strictEqual(context.businessGoalOrProblemStatement, 'User retention is below 20%')
})

test('extractContextFromSession should throw error if session missing validationRequest', () => {
  const session = { inputs: {} }

  assert.throws(
    () => extractContextFromSession(session),
    /missing required inputs.validationRequest/
  )
})

test('extractContextFromSession should use defaults for missing fields', () => {
  const session = {
    inputs: {
      validationRequest: {
        description: 'Some problem'
      }
    }
  }

  const context = extractContextFromSession(session)

  assert.strictEqual(context.problemStatement, 'Some problem')
  assert.strictEqual(context.location, 'not specified')
  assert.strictEqual(context.targetCustomer, 'not specified')
  assert.strictEqual(context.teamSize, 'not specified')
})

test('getMethodologyStep should return step metadata by ID', () => {
  const step = getMethodologyStep('jtbd')

  assert.ok(step)
  assert.strictEqual(step.id, 'jtbd')
  assert.strictEqual(step.name, 'Jobs-to-be-Done')
  assert.ok(step.progressLabel)
})

test('getMethodologyStep should return null for invalid ID', () => {
  const step = getMethodologyStep('invalid')
  assert.strictEqual(step, null)
})

test('getMethodologyOrder should return IDs in correct order', () => {
  const order = getMethodologyOrder()

  assert.deepStrictEqual(order, ['jtbd', 'designThinking', 'leanCanvas', 'rootCause', 'ost'])
})

test('buildPrompt should generate complete prompt for all methodologies', () => {
  const context = {
    problemStatement: 'Our SaaS has low retention after first month',
    location: 'San Francisco Bay Area',
    targetCustomer: 'Small to medium tech startups',
    teamSize: '4-10'
  }

  const methodologies = ['jtbd', 'designThinking', 'leanCanvas', 'rootCause', 'ost']

  methodologies.forEach(methodId => {
    const prompt = buildPrompt(methodId, context)

    // Each prompt should be substantial
    assert.ok(prompt.length > 500, `${methodId} prompt should be substantial`)

    // Should not contain any unreplaced placeholders
    assert.ok(!prompt.includes('{{'), `${methodId} should not have unreplaced placeholders`)
    assert.ok(!prompt.includes('}}'), `${methodId} should not have unreplaced placeholders`)

    // Should contain context data
    assert.ok(prompt.includes(context.location), `${methodId} should include location`)
    assert.ok(prompt.includes(context.targetCustomer), `${methodId} should include target customer`)
    assert.ok(prompt.includes(context.teamSize), `${methodId} should include team size`)
  })
})
