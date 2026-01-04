/**
 * SIT (Systematic Inventive Thinking) Prompt Templates
 * Five constraint-driven innovation tools: Subtraction, Division, Task Unification, Multiplication, Attribute Dependency
 */

/**
 * The five SIT tools
 * Each tool focuses on incremental, constraint-driven innovation
 */
export const SIT_TOOLS = [
  {
    id: 'subtraction',
    name: 'Subtraction',
    description: 'Remove essential components or steps to discover simpler, more elegant solutions',
    prompt: `You are applying the SIT "Subtraction" tool to generate constraint-driven solution ideas.

SUBTRACTION focuses on removing essential components, features, or steps from the existing system to discover simpler, more elegant solutions. This is NOT about removing unnecessary elements—it's about removing things that seem essential and finding ways to make the system work without them.

Key principles:
- Remove components that seem necessary or obvious
- Find ways to make the system work WITHOUT the removed element
- Emphasize simplicity and resource efficiency
- Work within existing constraints (budget, team, technology, etc.)
- Generate ideas that are realistic and implementable with current resources

Problem Context:
{problemDescription}

{clarificationContext}

Existing System/Process Context:
{systemContext}

Your task:
Generate 4-6 specific ideas that apply Subtraction to this problem/system. For each idea:
1. Identify what essential component, feature, or step you are removing
2. Explain how the system can still function or deliver value WITHOUT it
3. Describe the benefits (cost savings, simplification, faster execution, etc.)
4. Provide a short rationale explaining why this is promising given the constraints

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Brief descriptive title of the idea",
    "subtractedElement": "What you are removing (component/feature/step)",
    "description": "How the system works without this element (2-3 sentences)",
    "benefits": "Key benefits of this subtraction (1-2 sentences)",
    "rationale": "Why this is promising given existing constraints and resources (2-3 sentences)"
  }
]`
  },
  {
    id: 'division',
    name: 'Division',
    description: 'Divide components or processes in unconventional ways to enable new configurations',
    prompt: `You are applying the SIT "Division" tool to generate constraint-driven solution ideas.

DIVISION focuses on breaking apart components, processes, or responsibilities in unexpected ways. This includes:
- Functional division: Separating a component's functions
- Physical division: Splitting a component into parts
- Preserving division: Extracting a "snapshot" at a point in time
- Temporal division: Separating actions across time

Key principles:
- Divide in non-obvious ways (not just modular decomposition)
- Enable new configurations, flexibility, or distributed execution
- Work within existing constraints (budget, team, technology, etc.)
- Focus on practical, implementable divisions
- Consider how division enables reuse, specialization, or parallelization

Problem Context:
{problemDescription}

{clarificationContext}

Existing System/Process Context:
{systemContext}

Your task:
Generate 4-6 specific ideas that apply Division to this problem/system. For each idea:
1. Identify what component, process, or responsibility you are dividing
2. Describe HOW you are dividing it (functional/physical/preserving/temporal)
3. Explain the new configurations or capabilities this division enables
4. Provide a short rationale explaining why this is promising given the constraints

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Brief descriptive title of the idea",
    "dividedElement": "What you are dividing (component/process/responsibility)",
    "divisionType": "How you are dividing it (functional/physical/preserving/temporal)",
    "description": "New configurations or capabilities enabled by this division (2-3 sentences)",
    "benefits": "Key benefits of this division (1-2 sentences)",
    "rationale": "Why this is promising given existing constraints and resources (2-3 sentences)"
  }
]`
  },
  {
    id: 'task-unification',
    name: 'Task Unification',
    description: 'Assign additional tasks to existing components to create elegant multi-purpose solutions',
    prompt: `You are applying the SIT "Task Unification" tool to generate constraint-driven solution ideas.

TASK UNIFICATION focuses on assigning additional tasks to existing components, making them serve multiple purposes. This creates elegant, resource-efficient solutions by maximizing the utility of what you already have.

Key principles:
- Assign new tasks to existing components (not adding new components)
- Create multi-purpose elements that serve 2+ functions
- Emphasize resource efficiency and elegance
- Work within existing constraints (budget, team, technology, etc.)
- Focus on non-obvious task assignments that add value

Problem Context:
{problemDescription}

{clarificationContext}

Existing System/Process Context:
{systemContext}

Your task:
Generate 4-6 specific ideas that apply Task Unification to this problem/system. For each idea:
1. Identify which existing component/person/element will take on additional tasks
2. Describe the new task(s) being unified with the original function
3. Explain how this creates value or solves problems more efficiently
4. Provide a short rationale explaining why this is promising given the constraints

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Brief descriptive title of the idea",
    "existingComponent": "The component/person/element taking on additional tasks",
    "originalTask": "Its original function or purpose",
    "newTask": "The additional task(s) being assigned to it",
    "description": "How this unified component serves multiple purposes (2-3 sentences)",
    "benefits": "Key benefits of this unification (1-2 sentences)",
    "rationale": "Why this is promising given existing constraints and resources (2-3 sentences)"
  }
]`
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    description: 'Create multiple copies of components with slight variations to unlock new possibilities',
    prompt: `You are applying the SIT "Multiplication" tool to generate constraint-driven solution ideas.

MULTIPLICATION focuses on creating multiple copies of existing components, but with slight, meaningful variations. This is NOT simple duplication—each copy should differ in some important way (size, timing, location, configuration, etc.).

Key principles:
- Multiply existing components (not adding entirely new ones)
- Introduce meaningful variations between copies
- Enable parallel execution, redundancy, specialization, or coverage
- Work within existing constraints (budget, team, technology, etc.)
- Focus on practical, implementable multiplication strategies

Problem Context:
{problemDescription}

{clarificationContext}

Existing System/Process Context:
{systemContext}

Your task:
Generate 4-6 specific ideas that apply Multiplication to this problem/system. For each idea:
1. Identify which component/process/step you are multiplying
2. Describe the meaningful variation between copies (size/timing/config/etc.)
3. Explain the value created by having multiple varied copies
4. Provide a short rationale explaining why this is promising given the constraints

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Brief descriptive title of the idea",
    "multipliedElement": "What you are multiplying (component/process/step)",
    "variation": "How the copies differ from each other",
    "description": "Value created by multiple varied copies (2-3 sentences)",
    "benefits": "Key benefits of this multiplication (1-2 sentences)",
    "rationale": "Why this is promising given existing constraints and resources (2-3 sentences)"
  }
]`
  },
  {
    id: 'attribute-dependency',
    name: 'Attribute Dependency',
    description: 'Create dynamic relationships where one attribute changes based on another',
    prompt: `You are applying the SIT "Attribute Dependency" tool to generate constraint-driven solution ideas.

ATTRIBUTE DEPENDENCY focuses on creating new relationships where one attribute of the system changes based on another attribute. This enables adaptive, context-aware behavior without adding complex new components.

Key principles:
- Create dependencies between existing attributes
- Enable dynamic, adaptive behavior
- Respond to context, environment, user state, or system conditions
- Work within existing constraints (budget, team, technology, etc.)
- Focus on dependencies that add clear value

Problem Context:
{problemDescription}

{clarificationContext}

Existing System/Process Context:
{systemContext}

Your task:
Generate 4-6 specific ideas that apply Attribute Dependency to this problem/system. For each idea:
1. Identify the dependent attribute (what changes)
2. Identify the independent attribute (what triggers the change)
3. Describe how the dependency works and when it activates
4. Provide a short rationale explaining why this is promising given the constraints

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Brief descriptive title of the idea",
    "dependentAttribute": "What changes/adapts",
    "independentAttribute": "What triggers the change",
    "dependencyRule": "How the dependency works (if X then Y changes to Z)",
    "description": "How this adaptive behavior adds value (2-3 sentences)",
    "benefits": "Key benefits of this dependency (1-2 sentences)",
    "rationale": "Why this is promising given existing constraints and resources (2-3 sentences)"
  }
]`
  }
]

/**
 * Generate a prompt for a specific SIT tool
 * @param {Object} tool - SIT tool configuration from SIT_TOOLS
 * @param {Object} problemContext - Problem description and clarification
 * @param {Object} systemContext - Existing system/process context from analysis
 * @returns {string} Formatted prompt
 */
export function generateSitToolPrompt(tool, problemContext, systemContext = {}) {
  let clarificationContext = ''

  if (problemContext.location || problemContext.targetCustomer || problemContext.teamSize) {
    clarificationContext = 'Additional Context:\n'
    if (problemContext.location) {
      clarificationContext += `- Location/Market: ${problemContext.location}\n`
    }
    if (problemContext.targetCustomer) {
      clarificationContext += `- Target Customer: ${problemContext.targetCustomer}\n`
    }
    if (problemContext.teamSize) {
      clarificationContext += `- Team Size: ${problemContext.teamSize}\n`
    }
  }

  // Build system context from available analysis
  let systemContextText = 'Based on prior validation analysis:\n'
  if (systemContext.summary) {
    systemContextText += `${systemContext.summary}\n\n`
  }
  if (systemContext.constraints) {
    systemContextText += `Known constraints:\n${systemContext.constraints}\n\n`
  }
  systemContextText += 'Focus on incremental improvements within these constraints rather than radical redesign.'

  return tool.prompt
    .replace('{problemDescription}', problemContext.description)
    .replace('{clarificationContext}', clarificationContext)
    .replace('{systemContext}', systemContextText)
}

/**
 * Generate synthesis prompt for SIT results
 * @param {Object} allIdeas - Ideas organized by tool ID
 * @param {Object} problemContext - Problem description and context
 * @returns {string} Synthesis prompt
 */
export function generateSitSynthesisPrompt(allIdeas, problemContext) {
  let ideasByTool = ''

  SIT_TOOLS.forEach(tool => {
    const toolIdeas = allIdeas[tool.id]
    if (toolIdeas && toolIdeas.ideas && toolIdeas.ideas.length > 0) {
      ideasByTool += `\n## ${tool.name} Ideas:\n`
      toolIdeas.ideas.forEach((idea, idx) => {
        ideasByTool += `${idx + 1}. ${idea.title}\n`
        ideasByTool += `   ${idea.description}\n`
        ideasByTool += `   Benefits: ${idea.benefits}\n\n`
      })
    }
  })

  return `You are synthesizing the results of a SIT (Systematic Inventive Thinking) ideation session.

Problem Context:
${problemContext.description}

SIT Tools Applied:
The problem was analyzed using five SIT tools (Subtraction, Division, Task Unification, Multiplication, Attribute Dependency), each generating constraint-driven solution ideas.

Generated Ideas:
${ideasByTool}

Your task:
Provide a synthesis that helps the user understand and act on these SIT-generated ideas.

1. Comparative Analysis:
   - Identify which SIT tools generated the most promising ideas for this specific problem
   - Note patterns or themes across tools (e.g., multiple tools suggesting similar approaches)
   - Highlight synergies (ideas that could be combined for greater impact)

2. Top Concepts:
   - Select the 3-5 most viable solution concepts across all tools
   - For each concept, explain:
     * Which SIT tool(s) it came from
     * Why it's particularly well-suited to the problem constraints
     * What makes it implementable with current resources
     * Potential next steps for validation or prototyping

3. Constraint Alignment:
   - Emphasize how these ideas work WITHIN existing constraints
   - Highlight resource efficiency and incremental implementation

Return ONLY a valid JSON object with this structure:
{
  "comparativeAnalysis": {
    "mostPromisingTools": ["tool1", "tool2"],
    "crossToolPatterns": "Description of patterns across tools (2-3 sentences)",
    "synergies": "Opportunities to combine ideas (2-3 sentences)"
  },
  "topConcepts": [
    {
      "rank": 1,
      "title": "Concept title",
      "sitTools": ["subtraction", "task-unification"],
      "description": "What the concept involves (2-3 sentences)",
      "whyPromising": "Why it's well-suited to constraints (2-3 sentences)",
      "nextSteps": "Validation or prototyping steps (2-3 sentences)"
    }
  ],
  "constraintAlignment": "How these ideas respect and leverage existing constraints (2-3 sentences)"
}`
}

export const SIT_EXECUTION_CONFIG = {
  timeoutPerTool: 120000, // 2 minutes per tool
  maxIdeasPerTool: 6,
  minIdeasPerTool: 4
}
