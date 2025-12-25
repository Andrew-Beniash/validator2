import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ProcessingPage.css'

function ProcessingPage() {
  const navigate = useNavigate()

  const [status, setStatus] = useState('idle')
  const [steps, setSteps] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(null)
  const [currentStepLabel, setCurrentStepLabel] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let intervalId
    let cancelled = false

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/analysis/status', {
          credentials: 'include'
        })

        if (cancelled) return

        if (response.status === 404) {
          setError('No analysis found for this session. Please restart.')
          setStatus('failed')
          clearInterval(intervalId)
          return
        }

        if (!response.ok) {
          setError('We’re having trouble updating progress. Please try again.')
          setStatus('failed')
          clearInterval(intervalId)
          return
        }

        const data = await response.json()
        const analysis = data.data

        setStatus(analysis.status)
        setSteps(analysis.steps || [])
        setCurrentStepIndex(
          typeof analysis.currentStepIndex === 'number'
            ? analysis.currentStepIndex
            : null
        )
        setCurrentStepLabel(analysis.currentStepLabel || null)
        setError(analysis.error || null)

        if (analysis.status === 'completed') {
          clearInterval(intervalId)
          // TODO: Navigate to results page when implemented
          // navigate('/results')
        } else if (analysis.status === 'failed') {
          clearInterval(intervalId)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching analysis status:', err)
        setError('We’re having trouble updating progress. Please try again.')
        setStatus('failed')
        clearInterval(intervalId)
      }
    }

    // Initial fetch immediately
    fetchStatus()
    // Then poll every 1.5 seconds
    intervalId = setInterval(fetchStatus, 1500)

    return () => {
      cancelled = true
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  const totalSteps = steps.length || 5
  const completedCount = steps.filter(step => step.status === 'completed').length
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  const displayStepNumber = (() => {
    const idx =
      currentStepIndex != null ? currentStepIndex : completedCount > 0 ? completedCount : 0
    const num = idx + 1
    if (num < 1) return 1
    if (num > totalSteps) return totalSteps
    return num
  })()

  const currentStepName =
    currentStepIndex != null && steps[currentStepIndex]
      ? steps[currentStepIndex].name
      : steps[completedCount]?.name || 'Preparing analysis'

  const handleBackToConfig = () => {
    navigate('/config')
  }

  const handleBackToStart = () => {
    navigate('/problem')
  }

  const progressLabelText = `Step ${displayStepNumber} of ${totalSteps}: ${currentStepName}`

  return (
    <div className="processing-page">
      <div className="processing-card">
        <header className="processing-header">
          <h1>Analyzing Your Problem...</h1>
          <p className="processing-subtitle">
            We&apos;re running your problem through five expert frameworks to generate a
            structured validation. This usually takes under a minute.
          </p>
        </header>

        {error && (
          <div className="processing-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <section
          className="processing-progress-section"
          aria-label="Analysis progress"
        >
          <div
            className="processing-progress-summary"
            aria-live="polite"
          >
            <p className="processing-step-indicator">
              {progressLabelText}
            </p>
            {currentStepLabel && (
              <p className="processing-step-label">
                {currentStepLabel}
              </p>
            )}
          </div>

          <div
            className="processing-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={progressLabelText}
          >
            <div
              className="processing-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="processing-progress-percent">
            {progressPercent}% complete
          </div>
        </section>

        <section className="processing-steps" aria-label="Methodology steps">
          <ul className="processing-step-list">
            {steps.map(step => (
              <li
                key={step.id}
                className={`processing-step processing-step--${step.status}`}
              >
                <span className="processing-step-status-dot" />
                <span className="processing-step-name">{step.name}</span>
                <span className="processing-step-status-text">
                  {step.status === 'pending' && 'Pending'}
                  {step.status === 'in-progress' && 'In progress'}
                  {step.status === 'completed' && 'Completed'}
                  {step.status === 'failed' && 'Failed'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="processing-footer">
          {status === 'in-progress' || status === 'pending' ? (
            <div className="processing-spinner-wrapper">
              <div className="processing-spinner" />
              <p className="processing-spinner-text">
                Please keep this tab open while we complete the analysis.
              </p>
            </div>
          ) : null}

          {status === 'failed' && (
            <div className="processing-actions">
              <button
                type="button"
                className="processing-back-button"
                onClick={handleBackToConfig}
              >
                Back to configuration
              </button>
              <button
                type="button"
                className="processing-secondary-button"
                onClick={handleBackToStart}
              >
                Start over
              </button>
            </div>
          )}

          {status === 'completed' && (
            <div className="processing-actions processing-actions--completed">
              <p className="processing-complete-text">
                Analysis completed. Results view is coming soon.
              </p>
              {/* TODO: Replace with navigation to results page when implemented */}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default ProcessingPage

