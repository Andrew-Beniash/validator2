/**
 * Wizard Step Definitions
 * Defines the complete flow through problem validation and ideation phases
 */

export const WIZARD_STEPS = [
  {
    id: 'problem',
    number: 1,
    title: 'Describe Problem',
    path: '/problem',
    description: 'Share the problem you want to validate'
  },
  {
    id: 'clarification',
    number: 2,
    title: 'Clarify Context',
    path: '/clarification',
    description: 'Provide additional context about your problem'
  },
  {
    id: 'config',
    number: 3,
    title: 'Configure Email/API',
    path: '/config',
    description: 'Set up your email and API credentials'
  },
  {
    id: 'processing',
    number: 4,
    title: 'Analyze',
    path: '/processing',
    description: 'Running validation frameworks'
  },
  {
    id: 'results',
    number: 5,
    title: 'View Validation Results',
    path: '/results',
    description: 'Review your problem validation report'
  },
  {
    id: 'ideation',
    number: 6,
    title: 'Ideation',
    path: '/ideation',
    description: 'Generate solutions and hypotheses'
  },
  {
    id: 'ideation-processing',
    number: 6, // Same step as ideation, just processing
    title: 'Ideation',
    path: '/ideation-processing',
    description: 'Running ideation techniques',
    isSubStep: true
  }
]

/**
 * Get the current step based on pathname
 */
export function getCurrentStep(pathname) {
  return WIZARD_STEPS.find(step => step.path === pathname) || null
}

/**
 * Get step status based on current pathname
 */
export function getStepStatus(step, currentPathname) {
  const currentStep = getCurrentStep(currentPathname)

  if (!currentStep) {
    return 'upcoming'
  }

  // If this is the current step or sub-step
  if (step.path === currentPathname ||
      (step.id === currentStep.id && !step.isSubStep)) {
    return 'active'
  }

  // If this step comes before the current step
  if (step.number < currentStep.number) {
    return 'completed'
  }

  // If same number but current is a sub-step, mark parent as active
  if (step.number === currentStep.number && currentStep.isSubStep && !step.isSubStep) {
    return 'active'
  }

  return 'upcoming'
}

/**
 * Get visible steps (excluding sub-steps for cleaner display)
 */
export function getVisibleSteps() {
  return WIZARD_STEPS.filter(step => !step.isSubStep)
}
