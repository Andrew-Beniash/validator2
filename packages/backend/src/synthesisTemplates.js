/**
 * Synthesis prompt template and helpers.
 * Combines five methodology outputs into a single LLM prompt.
 */

export const SYNTHESIS_TEMPLATE = `You are an expert product strategist and problem validation analyst.

You have received five detailed analysis documents, each created using a different validation methodology. Your task is to synthesize these into a concise, 2-page style summary that a founder or product leader can quickly act on.

Use clear, structured sections with headings and full sentences. Avoid bullet point overload; prioritize clarity and practical insight.

Files:
1. JTBD Analysis:
{{JTBD_CONTENT}}


2. Design Thinking Analysis:
{{DESIGN_THINKING_CONTENT}}


3. Lean Canvas Analysis:
{{LEAN_CANVAS_CONTENT}}


4. Root Cause Analysis:
{{ROOT_CAUSE_CONTENT}}


5. Opportunity Solution Tree (OST) Analysis:
{{OST_CONTENT}}


Instructions:

1. Executive Summary (high-level, 2–3 paragraphs)
   - Summarize the core problem, context, and target customer in plain language.
   - Highlight the most important insight that emerged across all five methods.

2. Key Insights Across Methodologies
   - Explain where the methods converge (common themes, recurring pains, consistent signals).
   - Note any meaningful divergences or tensions between methods (e.g., one framework surfaces different risks).

3. Problem Clarity & Validation Strength
   - Assess how well-defined the problem is.
   - Identify the biggest assumptions still unvalidated.
   - Rate (qualitatively) the strength of validation so far (e.g., "weak", "moderate", "strong") and justify your rating.

4. Recommended Next Discovery Steps
   - Recommend 3–5 concrete discovery actions (e.g., interviews, experiments, metrics, prototypes) to further validate or refine the problem.
   - For each, explain what signal you’re looking for and how it would influence a go/no-go or prioritization decision.

5. Risks & Blind Spots
   - Call out key risks, biases, or blind spots in the current understanding of the problem.
   - Suggest how to mitigate them in future discovery work.

Tone:
- Be practical, balanced, and evidence-informed.
- Avoid hype; focus on clarity and decision support.

Output:
- Provide the summary as continuous text with clear section headings.
- Aim for a length roughly equivalent to 2 pages of typed text (you do not need to manage exact pagination).`

/**
 * Build a synthesis prompt by injecting five methodology contents
 * into the synthesis template.
 *
 * @param {Object} context
 * @param {string} context.jtbd
 * @param {string} context.designThinking
 * @param {string} context.leanCanvas
 * @param {string} context.rootCause
 * @param {string} context.ost
 * @returns {string}
 */
export function buildSynthesisPrompt(context) {
  const fallback = 'No analysis available for this method.'

  const jtbd = context?.jtbd && context.jtbd.trim().length > 0 ? context.jtbd : fallback
  const design = context?.designThinking && context.designThinking.trim().length > 0
    ? context.designThinking
    : fallback
  const lean = context?.leanCanvas && context.leanCanvas.trim().length > 0
    ? context.leanCanvas
    : fallback
  const root = context?.rootCause && context.rootCause.trim().length > 0
    ? context.rootCause
    : fallback
  const ost = context?.ost && context.ost.trim().length > 0 ? context.ost : fallback

  return SYNTHESIS_TEMPLATE
    .replace('{{JTBD_CONTENT}}', jtbd)
    .replace('{{DESIGN_THINKING_CONTENT}}', design)
    .replace('{{LEAN_CANVAS_CONTENT}}', lean)
    .replace('{{ROOT_CAUSE_CONTENT}}', root)
    .replace('{{OST_CONTENT}}', ost)
}

