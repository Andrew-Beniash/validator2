# Prompt Templates Documentation

## Overview

The `promptTemplates.js` module is the single source of truth for all analysis prompts and methodology metadata. It provides:

- **Standardized prompt templates** for five validation methodologies
- **Placeholder-based templating** for dynamic content injection
- **Sequential execution metadata** for UI progress tracking
- **Helper functions** for context extraction and prompt building

## Architecture

### Design Principles

1. **Single Source of Truth**: All prompt content is defined in one place
2. **Separation of Concerns**: Prompt templates are separate from execution logic
3. **Type Safety**: Clear interfaces and validation for all functions
4. **Extensibility**: Easy to add new methodologies or modify existing ones
5. **Testability**: All functions are pure and easily testable

## Exports

### METHODOLOGY_STEPS

An ordered array of methodology step definitions used for sequential execution and UI progress display.

**Type:**
```javascript
Array<{
  id: string,
  name: string,
  progressLabel: string,
  description: string
}>
```

**Structure:**
```javascript
[
  {
    id: 'jtbd',
    name: 'Jobs-to-be-Done',
    progressLabel: 'Analyzing with Jobs-to-be-Done framework... (1/5)',
    description: 'Uncovering the underlying job users are trying to accomplish'
  },
  {
    id: 'designThinking',
    name: 'Design Thinking – Define',
    progressLabel: 'Running Design Thinking analysis... (2/5)',
    description: 'Synthesizing user research into a clear problem definition'
  },
  {
    id: 'leanCanvas',
    name: 'Lean Problem Validation',
    progressLabel: 'Validating with Lean Canvas... (3/5)',
    description: 'Evaluating problem-customer fit using Lean Canvas framework'
  },
  {
    id: 'rootCause',
    name: 'Root Cause Analysis',
    progressLabel: 'Performing Root Cause Analysis... (4/5)',
    description: 'Identifying true causes using 5 Whys and Fishbone analysis'
  },
  {
    id: 'ost',
    name: 'Opportunity Solution Tree',
    progressLabel: 'Building Opportunity Solution Tree... (5/5)',
    description: 'Mapping opportunities from business outcomes to solutions'
  }
]
```

**Usage:**
- Backend: Iterate through steps for sequential execution
- Frontend: Display progress labels in real-time during analysis
- Both: Use step metadata for status tracking and reporting

### PROMPT_TEMPLATES

A map of methodology IDs to their corresponding prompt template strings.

**Type:**
```javascript
{
  jtbd: string,
  designThinking: string,
  leanCanvas: string,
  rootCause: string,
  ost: string
}
```

**Placeholders Used:**

All templates use the following placeholders:
- `{{PROBLEM_STATEMENT}}` - Main problem description from Page 1
- `{{LOCATION}}` - Location/market/region from Page 2
- `{{TARGET_CUSTOMER}}` - Target customer segment from Page 2
- `{{TEAM_SIZE}}` - Team size from Page 2

**Special Placeholder:**
- `{{BUSINESS_GOAL_OR_PROBLEM_STATEMENT}}` - Used only in OST template; defaults to problem statement if business goal not specified

### buildPrompt(methodId, context)

Builds a complete prompt by replacing placeholders with context data.

**Parameters:**
```javascript
{
  methodId: string,        // 'jtbd' | 'designThinking' | 'leanCanvas' | 'rootCause' | 'ost'
  context: {
    problemStatement?: string,
    location?: string,
    targetCustomer?: string,
    teamSize?: string,
    businessGoalOrProblemStatement?: string  // Optional; defaults to problemStatement
  }
}
```

**Returns:** `string` - Complete prompt with all placeholders replaced

**Throws:** `Error` if methodId is invalid

**Example:**
```javascript
import { buildPrompt } from './promptTemplates.js'

const context = {
  problemStatement: 'Our SaaS has 20% user retention after first month',
  location: 'San Francisco Bay Area',
  targetCustomer: 'Small to medium tech startups',
  teamSize: '4-10'
}

const prompt = buildPrompt('jtbd', context)
// Returns complete JTBD prompt with all placeholders filled
```

**Default Values:**

If context fields are missing, they default to `'not specified'`:
```javascript
{
  problemStatement: 'not specified',
  location: 'not specified',
  targetCustomer: 'not specified',
  teamSize: 'not specified',
  businessGoalOrProblemStatement: 'not specified'
}
```

### extractContextFromSession(session)

Helper to extract and map session data to prompt context format.

**Parameters:**
```javascript
{
  session: {
    inputs: {
      validationRequest: {
        description: string,
        location: string,
        targetCustomer: string,
        teamSize: string
      }
    }
  }
}
```

**Returns:** Context object ready for `buildPrompt`

**Throws:** `Error` if session is missing `inputs.validationRequest`

**Example:**
```javascript
import { extractContextFromSession, buildPrompt } from './promptTemplates.js'

const session = await sessionStore.get(sessionId)
const context = extractContextFromSession(session)
const prompt = buildPrompt('jtbd', context)
```

### getMethodologyStep(methodId)

Get methodology step metadata by ID.

**Parameters:** `methodId: string`

**Returns:** Step object or `null` if not found

**Example:**
```javascript
import { getMethodologyStep } from './promptTemplates.js'

const step = getMethodologyStep('jtbd')
console.log(step.progressLabel)  // "Analyzing with Jobs-to-be-Done framework... (1/5)"
```

### getMethodologyOrder()

Get all methodology IDs in execution order.

**Returns:** `string[]` - Array of methodology IDs

**Example:**
```javascript
import { getMethodologyOrder } from './promptTemplates.js'

const order = getMethodologyOrder()
// ['jtbd', 'designThinking', 'leanCanvas', 'rootCause', 'ost']
```

## Methodology Details

### 1. Jobs-to-be-Done (JTBD)

**Focus:** Uncovering the underlying "job" users are trying to accomplish

**Key Concepts:**
- Functional, emotional, and social dimensions of the job
- Current workarounds and frustrations
- Desired outcomes and success metrics
- Job maps and validation questions

**Output Format:**
- JTBD statement
- Job context and dimensions
- Current solutions analysis
- Validation recommendations

### 2. Design Thinking – Define Phase

**Focus:** Synthesizing user research into clear problem definition

**Key Concepts:**
- Empathy mapping (thinks, feels, sees, hears, says, does)
- POV statements: "[User] needs a way to [need] because [insight]"
- Emotional and situational context
- Research method recommendations

**Output Format:**
- User persona description
- Empathy map
- Problem statement (POV format)
- Validation assumptions and methods

### 3. Lean Problem Validation (Lean Canvas)

**Focus:** Early clarity on problems, customers, and alternatives

**Key Concepts:**
- Top 3 customer problems
- Current alternatives/workarounds
- Early adopter identification
- Assumption testing (interviews, landing pages, smoke tests)

**Output Format:**
- Lean Canvas Problem section
- Problem prioritization (pain, frequency, monetization)
- Testing recommendations
- Early validation steps

### 4. Root Cause Analysis

**Focus:** Uncovering true causes vs. treating symptoms

**Key Concepts:**
- 5 Whys technique (iterative why questioning)
- Fishbone diagram categories (People, Process, Technology, Environment, Policy)
- Root vs. symptom identification
- Verification methods

**Output Format:**
- 5 Whys analysis
- Fishbone breakdown by category
- Root problem definition
- Verification plan

### 5. Opportunity Solution Tree (OST)

**Focus:** Path from business outcomes to customer problems to solutions

**Key Concepts:**
- Business outcome identification
- Customer opportunities (unmet needs, frustrations, pain points)
- Prioritization (desirability, viability, feasibility)
- Discovery methods (interviews, behavior analysis, surveys)

**Output Format:**
- Outcome statement
- Opportunity breakdown with business impact
- Prioritization analysis
- Sample subtree (outcome → opportunity → solutions)

## Usage Patterns

### Sequential Analysis Execution

```javascript
import {
  METHODOLOGY_STEPS,
  buildPrompt,
  extractContextFromSession
} from './promptTemplates.js'

// Get session context
const context = extractContextFromSession(session)

// Execute each methodology in order
for (const step of METHODOLOGY_STEPS) {
  // Update UI progress
  console.log(step.progressLabel)

  // Build prompt
  const prompt = buildPrompt(step.id, context)

  // Send to LLM
  const result = await llmService.analyze(prompt)

  // Store result
  session.results.analysis.steps[index].result = result
  session.results.analysis.steps[index].status = 'completed'
}
```

### Real-Time Progress Updates

```javascript
// Backend: Update session with current step
session.results.analysis.currentStep = step.progressLabel
session.results.analysis.currentStepIndex = index
await session.save()

// Frontend: Poll or WebSocket for progress
const status = await fetch('/api/analysis/status')
const { currentStep } = status.data
// Display: "Running Design Thinking analysis... (2/5)"
```

### Context Mapping from Form Data

```javascript
import { buildPrompt } from './promptTemplates.js'

// After POST /api/analysis/init
const context = {
  problemStatement: req.body.problem.description,
  location: req.body.clarification.location,
  targetCustomer: req.body.clarification.targetCustomer,
  teamSize: req.body.clarification.teamSize
}

// Generate prompts for all methodologies
const prompts = METHODOLOGY_STEPS.map(step => ({
  methodId: step.id,
  prompt: buildPrompt(step.id, context)
}))
```

## Integration Points

### With Analysis Engine

The analysis engine (to be implemented) will:

1. **Initialize:** Load `METHODOLOGY_STEPS` to know execution order
2. **Iterate:** Loop through each step sequentially
3. **Build:** Use `buildPrompt()` with session context
4. **Execute:** Send prompt to LLM service
5. **Update:** Store result and update step status
6. **Progress:** Use `progressLabel` for UI updates

### With Session Management

Session structure for analysis:

```javascript
{
  inputs: {
    validationRequest: {
      description: "...",      // → problemStatement
      location: "...",         // → location
      targetCustomer: "...",   // → targetCustomer
      teamSize: "..."          // → teamSize
    }
  },
  results: {
    analysis: {
      status: 'pending' | 'in-progress' | 'completed' | 'failed',
      currentStep: "Analyzing with Jobs-to-be-Done framework... (1/5)",
      currentStepIndex: 0,
      startedAt: "2024-01-15T10:30:00Z",
      completedAt: null,
      steps: [
        {
          name: 'JTBD',
          status: 'completed',
          result: { /* LLM response */ }
        },
        // ... more steps
      ],
      error: null
    }
  }
}
```

### With Frontend UI

Frontend displays progress using step metadata:

```javascript
// Fetch current status
const { data } = await fetch('/api/analysis/status')

// Display current step progress
if (data.currentStep) {
  showProgress(data.currentStep)  // "Running Design Thinking analysis... (2/5)"
}

// Show completed steps
data.steps.forEach((step, index) => {
  const metadata = METHODOLOGY_STEPS[index]
  renderStep({
    name: metadata.name,
    description: metadata.description,
    status: step.status,
    hasResult: !!step.result
  })
})
```

## Extension Guide

### Adding a New Methodology

1. **Add to METHODOLOGY_STEPS:**
```javascript
{
  id: 'newMethod',
  name: 'New Methodology Name',
  progressLabel: 'Running new methodology... (6/6)',
  description: 'Brief description of what this method does'
}
```

2. **Add template to PROMPT_TEMPLATES:**
```javascript
newMethod: `You are a [role] using [methodology]...
{{PROBLEM_STATEMENT}}
{{LOCATION}}
{{TARGET_CUSTOMER}}
{{TEAM_SIZE}}
[Detailed instructions...]`
```

3. **Update tests** in `test/promptTemplates.test.js`

4. **Update documentation** with methodology details

### Modifying Existing Templates

1. Edit the template string in `PROMPT_TEMPLATES`
2. Maintain existing placeholders or document changes
3. Run tests to ensure no breaking changes
4. Update this documentation if behavior changes

### Adding New Placeholders

1. **Add to DEFAULT_VALUES:**
```javascript
const DEFAULT_VALUES = {
  // ... existing
  newField: 'default value'
}
```

2. **Add replacement in buildPrompt:**
```javascript
prompt = prompt.replace(/\{\{NEW_FIELD\}\}/g, finalContext.newField)
```

3. **Update extractContextFromSession** if needed

4. **Document in this file** and update tests

## Best Practices

### For Template Authors

- Use descriptive placeholder names
- Include methodology overview at template start
- Structure prompts with clear sections
- Specify desired output format
- Include context fields for personalization
- Keep templates focused on one methodology

### For Developers

- Always use `buildPrompt()` instead of manual string replacement
- Use `extractContextFromSession()` for consistent mapping
- Validate context before building prompts
- Handle missing fields gracefully with defaults
- Test prompts with edge cases (missing fields, special characters)
- Log generated prompts in development for debugging

### For UI/UX

- Display `progressLabel` during execution for user feedback
- Show step `name` and `description` in step lists
- Use `status` field for visual indicators (pending, in-progress, completed)
- Provide access to completed step results
- Handle errors gracefully with step-level error messages

## Testing

Run tests with:
```bash
npm test -- test/promptTemplates.test.js
```

**Test Coverage:**
- Metadata structure validation
- Template placeholder verification
- Context substitution
- Default value handling
- Error handling for invalid inputs
- Session data extraction
- Complete prompt generation for all methodologies

## Security Considerations

- **No Sensitive Data:** Templates should not contain API keys or credentials
- **Sanitization:** Context values should be sanitized before injection if user-provided
- **Length Limits:** Consider prompt length limits for LLM providers
- **Logging:** Be careful logging complete prompts in production (may contain user data)

## Performance Notes

- All functions are synchronous and fast
- Template replacement uses regex for efficiency
- No external dependencies
- Prompts are built on-demand (no caching needed for typical use)
- Average prompt length: 1,500-2,500 characters

## Troubleshooting

### Issue: Placeholders not replaced

**Cause:** Typo in placeholder name or context field missing

**Solution:** Check placeholder spelling matches template exactly; verify context object has all required fields

### Issue: "Invalid methodology ID" error

**Cause:** Method ID doesn't exist in PROMPT_TEMPLATES

**Solution:** Use valid IDs from `getMethodologyOrder()` or check for typos

### Issue: Context extraction fails

**Cause:** Session structure doesn't match expected format

**Solution:** Ensure session has `inputs.validationRequest` with required fields; check session initialization logic

## Future Enhancements

- [ ] Support for multi-language templates
- [ ] Template versioning for A/B testing
- [ ] Dynamic prompt optimization based on LLM feedback
- [ ] Prompt length calculation and truncation
- [ ] Rich text formatting for better LLM comprehension
- [ ] Conditional sections based on context availability
- [ ] Template validation and linting tools
