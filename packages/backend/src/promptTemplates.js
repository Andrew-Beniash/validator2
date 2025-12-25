/**
 * Prompt Templates for Five Validation Methodologies
 * Single source of truth for all analysis prompts and step metadata
 */

/**
 * Ordered array of methodology steps with metadata
 * Used for sequential execution and UI progress display
 */
export const METHODOLOGY_STEPS = [
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

/**
 * Prompt templates for each methodology
 * Uses placeholder tokens for dynamic content injection
 */
export const PROMPT_TEMPLATES = {
  jtbd: `Jobs-to-be-Done (JTBD):
JTBD helps you uncover the underlying "job" the user is trying to accomplish, regardless of the current solution. By focusing on the progress the user wants to make in a specific situation, it enables you to extract motivations, triggers, desired outcomes, and constraints. This method often uses interviews and customer observations to surface unmet needs and define the problem in actionable, user-centered terms.

You are a product strategist using the Jobs-to-be-Done (JTBD) framework to analyze a user-defined problem. The user described the problem as: "{{PROBLEM_STATEMENT}}".

Additional context:
- Location/Market: {{LOCATION}}
- Target Customer: {{TARGET_CUSTOMER}}
- Team Size: {{TEAM_SIZE}}

Conduct a detailed analysis in the JTBD format. Begin by identifying the main job the user (or target customer) is trying to accomplish, and describe the context or situation where the job arises. Identify functional, emotional, and social dimensions of the job. Explore current workarounds and frustrations users face while trying to complete this job. Then, define desired outcomes and success metrics from the user's point of view.

Suggest questions or observations that would help validate the job and assess whether it's underserved. Conclude by summarizing the core JTBD statement, job map (if relevant), and recommendations for validating or refining this problem definition. Format as a structured analysis with clear sections and full paragraphs.`,

  designThinking: `Design Thinking – Define Phase:
In this methodology, the problem brief emerges from immersive user research during the "Empathize" phase, then synthesized in the "Define" phase. Tools like empathy maps and point-of-view (POV) statements help distill the most meaningful insights into a structured problem statement that captures user needs, context, and emotional drivers. It's especially effective when tackling ambiguous or human-centered challenges.

You are a Design Thinking practitioner conducting a deep problem definition exercise based on the following user-stated issue: "{{PROBLEM_STATEMENT}}".

Additional context:
- Location/Market: {{LOCATION}}
- Target Customer: {{TARGET_CUSTOMER}}
- Team Size: {{TEAM_SIZE}}

First, infer or describe the primary user or persona affected by this problem. Use empathy mapping to analyze what this user thinks, feels, sees, hears, says, and does. Describe the emotional and situational context around the problem and identify pain points and needs.

Next, move into the Define phase. Write a clear and concise problem statement in the format: "[User] needs a way to [user's need] because [insight]." List assumptions and gaps that must be validated. Provide suggestions for user research methods to strengthen or test the definition (e.g., interviews, journey mapping, observations). Conclude with actionable guidance on how to move from problem to ideation.`,

  leanCanvas: `Lean Problem Validation (Lean Canvas - Problem Section):
The Lean Canvas provides a standardized template that forces early clarity by focusing on top problems, customer segments, existing alternatives, and early adopters. It encourages founders and product teams to avoid solution bias and test assumptions early using fast cycles of qualitative feedback or landing pages, making it useful for product-focused problem briefs.

You are acting as a startup coach using the Lean Canvas framework to evaluate a business opportunity based on the following problem: "{{PROBLEM_STATEMENT}}".

Additional context:
- Location/Market: {{LOCATION}}
- Target Customer: {{TARGET_CUSTOMER}}
- Team Size: {{TEAM_SIZE}}

Focus your analysis specifically on the "Problem" section of the Lean Canvas. Identify the top three problems experienced by the target customer segment, as implied or stated in the input. Describe current alternatives or workarounds customers are using today. Define who the early adopters might be.

Explain what assumptions underlie the problem and how those could be tested early (e.g., through interviews, landing pages, smoke tests). Evaluate whether the problem is painful, frequent, and monetizable. Conclude by restating the problem section as it would appear in a Lean Canvas, and suggest next steps to validate it before building solutions.`,

  rootCause: `Root Cause Analysis (5 Whys / Fishbone Diagram):
This method focuses on uncovering the true causes of a problem rather than just treating symptoms. The 5 Whys technique pushes you to repeatedly ask "why" to get past surface-level issues, while the Fishbone (Ishikawa) diagram helps visualize contributing factors across categories like people, process, and technology. It's best used when problems are recurring or operational in nature.

You are acting as a systems thinker and problem solver using Root Cause Analysis to deconstruct the following issue: "{{PROBLEM_STATEMENT}}".

Additional context:
- Location/Market: {{LOCATION}}
- Target Customer: {{TARGET_CUSTOMER}}
- Team Size: {{TEAM_SIZE}}

Begin by applying the "5 Whys" technique: start with the stated problem and iteratively ask "Why?" to identify deeper causes. Continue until you reach a root cause that is not merely a symptom.

Next, create a Fishbone-style breakdown of contributing factors under categories such as People, Process, Technology, Environment, and Policy. Analyze how each category might be influencing the problem.

Summarize your findings, define the root problem in a revised format, and recommend steps to verify each root cause through data, observation, or stakeholder interviews. Include risk of misidentification and suggest how to avoid jumping to conclusions.`,

  ost: `Opportunity Solution Tree (OST):
OST, popularized by Teresa Torres, visualizes the path from a high-level business outcome to customer problems ("opportunities") and only then to potential solutions. It keeps teams focused on evidence-based discovery and helps prioritize which problems are worth solving before jumping into ideation. This is valuable for product strategy and cross-functional prioritization.

You are a product discovery lead guiding a team through the Opportunity Solution Tree (OST) methodology to define and validate a problem. The team has received the following outcome or goal: "{{BUSINESS_GOAL_OR_PROBLEM_STATEMENT}}".

Additional context:
- Location/Market: {{LOCATION}}
- Target Customer: {{TARGET_CUSTOMER}}
- Team Size: {{TEAM_SIZE}}

Begin by identifying the overarching outcome or desired impact. Then, brainstorm and describe multiple customer opportunities—unmet needs, frustrations, or pain points—that could be contributing to this outcome. For each opportunity, briefly explain its relevance and potential business impact.

Prioritize opportunities using desirability (customer pain), viability (business alignment), and feasibility (doable with resources). From the top 1–2 opportunities, recommend potential discovery methods (interviews, behavior analysis, surveys) to validate their importance.

Conclude with a sample subtree outlining outcome → opportunity → possible solution directions, without committing to solutions yet.`
}

/**
 * Default values for missing context fields
 */
const DEFAULT_VALUES = {
  problemStatement: 'not specified',
  location: 'not specified',
  targetCustomer: 'not specified',
  teamSize: 'not specified',
  businessGoalOrProblemStatement: 'not specified'
}

/**
 * Build a complete prompt by replacing placeholders with context data
 *
 * @param {string} methodId - The methodology ID (jtbd, designThinking, etc.)
 * @param {Object} context - Context object with user/session data
 * @param {string} context.problemStatement - Main problem description from Page 1
 * @param {string} context.location - Location/region from Page 2
 * @param {string} context.targetCustomer - Target customer segment from Page 2
 * @param {string} context.teamSize - Team size from Page 2
 * @param {string} context.businessGoalOrProblemStatement - For OST; defaults to problemStatement
 * @returns {string} The complete prompt with placeholders replaced
 * @throws {Error} If methodId is invalid
 */
export function buildPrompt(methodId, context = {}) {
  // Validate method ID
  if (!PROMPT_TEMPLATES[methodId]) {
    throw new Error(`Invalid methodology ID: ${methodId}. Valid IDs are: ${Object.keys(PROMPT_TEMPLATES).join(', ')}`)
  }

  // Merge context with defaults
  const finalContext = {
    problemStatement: context.problemStatement || DEFAULT_VALUES.problemStatement,
    location: context.location || DEFAULT_VALUES.location,
    targetCustomer: context.targetCustomer || DEFAULT_VALUES.targetCustomer,
    teamSize: context.teamSize || DEFAULT_VALUES.teamSize,
    businessGoalOrProblemStatement: context.businessGoalOrProblemStatement || context.problemStatement || DEFAULT_VALUES.businessGoalOrProblemStatement
  }

  // Get the template
  let prompt = PROMPT_TEMPLATES[methodId]

  // Replace placeholders
  prompt = prompt.replace(/\{\{PROBLEM_STATEMENT\}\}/g, finalContext.problemStatement)
  prompt = prompt.replace(/\{\{LOCATION\}\}/g, finalContext.location)
  prompt = prompt.replace(/\{\{TARGET_CUSTOMER\}\}/g, finalContext.targetCustomer)
  prompt = prompt.replace(/\{\{TEAM_SIZE\}\}/g, finalContext.teamSize)
  prompt = prompt.replace(/\{\{BUSINESS_GOAL_OR_PROBLEM_STATEMENT\}\}/g, finalContext.businessGoalOrProblemStatement)

  return prompt
}

/**
 * Helper to extract context from session data
 * Maps session structure to prompt context format
 *
 * @param {Object} session - The session object from sessionStore
 * @returns {Object} Context object ready for buildPrompt
 */
export function extractContextFromSession(session) {
  if (!session?.inputs?.validationRequest) {
    throw new Error('Session is missing required inputs.validationRequest data')
  }

  const { validationRequest } = session.inputs

  return {
    problemStatement: validationRequest.description || DEFAULT_VALUES.problemStatement,
    location: validationRequest.location || DEFAULT_VALUES.location,
    targetCustomer: validationRequest.targetCustomer || DEFAULT_VALUES.targetCustomer,
    teamSize: validationRequest.teamSize || DEFAULT_VALUES.teamSize,
    businessGoalOrProblemStatement: validationRequest.description || DEFAULT_VALUES.businessGoalOrProblemStatement
  }
}

/**
 * Get methodology step metadata by ID
 *
 * @param {string} methodId - The methodology ID
 * @returns {Object|null} Step metadata or null if not found
 */
export function getMethodologyStep(methodId) {
  return METHODOLOGY_STEPS.find(step => step.id === methodId) || null
}

/**
 * Get all methodology IDs in execution order
 *
 * @returns {string[]} Array of methodology IDs
 */
export function getMethodologyOrder() {
  return METHODOLOGY_STEPS.map(step => step.id)
}
