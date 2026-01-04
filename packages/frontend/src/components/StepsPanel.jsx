import { useLocation } from 'react-router-dom'
import { getVisibleSteps, getStepStatus } from '../constants/wizardSteps'
import './StepsPanel.css'

function StepsPanel() {
  const location = useLocation()
  const steps = getVisibleSteps()

  return (
    <nav className="steps-panel" aria-label="Progress">
      <div className="steps-panel-header">
        <h2 className="steps-panel-title">Analysis Journey</h2>
        <p className="steps-panel-subtitle">Problem Validation &amp; Ideation</p>
      </div>

      <ol className="steps-list">
        {steps.map((step) => {
          const status = getStepStatus(step, location.pathname)

          return (
            <li
              key={step.id}
              className={`step-item step-item--${status}`}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <div className="step-indicator">
                <div className="step-number-circle">
                  {status === 'completed' ? (
                    <svg
                      className="step-check-icon"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="step-number">{step.number}</span>
                  )}
                </div>
                {step.number < 6 && (
                  <div className="step-connector" aria-hidden="true" />
                )}
              </div>

              <div className="step-content">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default StepsPanel
