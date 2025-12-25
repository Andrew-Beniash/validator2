/**
 * Example: How to use the prompt templates module
 *
 * Run with: node examples/prompt-example.js
 */

import {
  METHODOLOGY_STEPS,
  buildPrompt,
  extractContextFromSession,
  getMethodologyOrder,
  getMethodologyStep
} from '../src/promptTemplates.js'

// Example 1: Basic prompt generation
console.log('=== Example 1: Basic Prompt Generation ===\n')

const context = {
  problemStatement: 'Our SaaS platform has user retention below 20% after the first month. Users say they like the product but stop logging in after 2-3 weeks.',
  location: 'San Francisco Bay Area',
  targetCustomer: 'Small to medium-sized tech startups with 10-50 employees',
  teamSize: '4-10'
}

const jtbdPrompt = buildPrompt('jtbd', context)
console.log('Generated JTBD Prompt:')
console.log(jtbdPrompt.substring(0, 500) + '...\n')

// Example 2: Sequential execution pattern
console.log('=== Example 2: Sequential Execution Pattern ===\n')

const order = getMethodologyOrder()
console.log('Execution order:', order)
console.log('\nProgress labels:')

METHODOLOGY_STEPS.forEach((step, index) => {
  console.log(`${index + 1}. ${step.progressLabel}`)
})
console.log()

// Example 3: Session context extraction
console.log('=== Example 3: Session Context Extraction ===\n')

const mockSession = {
  inputs: {
    validationRequest: {
      description: 'User retention problem in SaaS product',
      location: 'Global',
      targetCustomer: 'Enterprise customers',
      teamSize: '11-50'
    }
  }
}

const sessionContext = extractContextFromSession(mockSession)
console.log('Extracted context:', JSON.stringify(sessionContext, null, 2))
console.log()

// Example 4: Generate prompts for all methodologies
console.log('=== Example 4: Generate All Prompts ===\n')

const allPrompts = METHODOLOGY_STEPS.map(step => {
  const prompt = buildPrompt(step.id, context)
  return {
    id: step.id,
    name: step.name,
    promptLength: prompt.length,
    preview: prompt.substring(0, 100) + '...'
  }
})

console.table(allPrompts)

// Example 5: OST with custom business goal
console.log('\n=== Example 5: OST with Custom Business Goal ===\n')

const ostContext = {
  ...context,
  businessGoalOrProblemStatement: 'Increase user engagement by 50% within 6 months'
}

const ostPrompt = buildPrompt('ost', ostContext)
console.log('OST with business goal (first 400 chars):')
console.log(ostPrompt.substring(0, 400) + '...\n')

// Example 6: Getting step metadata
console.log('=== Example 6: Step Metadata ===\n')

const jtbdStep = getMethodologyStep('jtbd')
console.log('JTBD Step Metadata:')
console.log({
  id: jtbdStep.id,
  name: jtbdStep.name,
  description: jtbdStep.description,
  progressLabel: jtbdStep.progressLabel
})
console.log()

// Example 7: Error handling
console.log('=== Example 7: Error Handling ===\n')

try {
  buildPrompt('invalidMethod', context)
} catch (error) {
  console.log('Caught expected error:', error.message)
}

try {
  extractContextFromSession({ inputs: {} })
} catch (error) {
  console.log('Caught expected error:', error.message)
}

console.log('\n✅ All examples completed successfully!')
