/**
 * SCAMPER Ideation Prompt Templates
 * Generates solution variations using the seven SCAMPER lenses
 */

/**
 * SCAMPER lenses metadata
 */
export const SCAMPER_LENSES = [
  {
    id: 'substitute',
    name: 'Substitute',
    description: 'What can you substitute or replace to improve the current approach?',
    prompt: 'What components, processes, materials, or resources could be substituted or replaced?'
  },
  {
    id: 'combine',
    name: 'Combine',
    description: 'What can you combine or integrate to create new value?',
    prompt: 'What features, processes, or resources could be combined or merged together?'
  },
  {
    id: 'adapt',
    name: 'Adapt',
    description: 'What can you adapt from other contexts or industries?',
    prompt: 'What ideas from other contexts, industries, or domains could be adapted to solve this problem?'
  },
  {
    id: 'modify',
    name: 'Modify (Magnify/Minify)',
    description: 'What can you modify, magnify, or minimize?',
    prompt: 'What could be changed in size, scale, frequency, intensity, or form?'
  },
  {
    id: 'purpose',
    name: 'Put to Another Use',
    description: 'How can you use this differently or repurpose it?',
    prompt: 'How could existing resources, processes, or capabilities be repurposed or used differently?'
  },
  {
    id: 'eliminate',
    name: 'Eliminate',
    description: 'What can you remove or simplify?',
    prompt: 'What features, steps, components, or complexities could be eliminated or simplified?'
  },
  {
    id: 'reverse',
    name: 'Reverse (Rearrange)',
    description: 'What can you reverse, rearrange, or do oppositely?',
    prompt: 'What if you reversed the process, changed the sequence, or approached it from the opposite direction?'
  }
]

/**
 * Generate per-lens SCAMPER prompt
 */
export function generateScamperLensPrompt(lens, problemContext) {
  const { description, location, targetCustomer, teamSize } = problemContext

  return `You are a creative problem-solving expert using the SCAMPER technique.

**SCAMPER Lens**: ${lens.name}
**Focus Question**: ${lens.prompt}

**Problem Context**:
${description}

${location ? `**Location**: ${location}\n` : ''}${targetCustomer ? `**Target Customer**: ${targetCustomer}\n` : ''}${teamSize ? `**Team Size**: ${teamSize}\n` : ''}

**Task**:
Using the "${lens.name}" lens, generate 4-6 specific, creative solution variations that address this problem. For EACH variation:

1. **Idea Title**: A concise, descriptive name for the solution concept
2. **Description**: A clear explanation of what would change or be implemented (2-3 sentences)
3. **Problem Connection**: Explicitly explain HOW this variation addresses the user's problem or improves the current situation (2-3 sentences)
4. **Implementation Notes**: Brief notes on feasibility, required resources, or key considerations (1-2 sentences)

Format your response as a JSON array of objects with this structure:
[
  {
    "title": "Solution concept name",
    "description": "What changes and how it works",
    "problemConnection": "How this addresses the specific problem",
    "implementationNotes": "Feasibility and key considerations"
  },
  ...
]

Be specific and actionable. Ground each idea in the actual problem context provided.`
}

/**
 * Generate synthesis and ranking prompt
 */
export function generateScamperSynthesisPrompt(allIdeas, problemContext) {
  const ideasByLens = SCAMPER_LENSES.map(lens => ({
    lens: lens.name,
    ideas: allIdeas[lens.id] || []
  }))

  const ideasText = ideasByLens
    .map(({ lens, ideas }) => {
      const ideasList = ideas
        .map((idea, i) => `   ${i + 1}. **${idea.title}**: ${idea.description}`)
        .join('\n')
      return `**${lens}**:\n${ideasList}`
    })
    .join('\n\n')

  return `You are a product strategy expert evaluating solution concepts for viability.

**Original Problem**:
${problemContext.description}

**All Generated Ideas (organized by SCAMPER lens)**:

${ideasText}

**Task**:
1. **Comparative Analysis**: Provide a brief analysis comparing the ideas across two dimensions:
   - **Impact**: Potential to solve the problem effectively
   - **Feasibility**: Ease of implementation, required resources, time to market

2. **Top Concepts**: Select and rank the 3-5 MOST PROMISING solution concepts from across all lenses. For each:
   - **Rank** (1-5)
   - **Concept Title** (from the ideas above)
   - **Justification**: Why this concept stands out (impact + feasibility balance)
   - **Next Steps**: 1-2 specific actions to validate or implement this concept

Format your response as JSON:
{
  "comparativeAnalysis": "Your analysis of the ideas across impact and feasibility dimensions (3-4 sentences)",
  "topConcepts": [
    {
      "rank": 1,
      "title": "Concept name from ideas",
      "justification": "Why this concept is promising",
      "nextSteps": "Specific validation or implementation actions"
    },
    ...
  ]
}

Be objective and strategic in your evaluation.`
}

/**
 * Full SCAMPER execution metadata
 */
export const SCAMPER_EXECUTION_CONFIG = {
  totalLenses: SCAMPER_LENSES.length,
  estimatedTimePerLens: 15000, // 15 seconds per lens
  maxRetries: 2,
  timeoutPerLens: 30000 // 30 seconds
}
