import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IDEATION_TECHNIQUES, TOTAL_TECHNIQUES } from '../constants/ideationTechniques'
import './IdeationProcessingPage.css'

function IdeationProcessingPage() {
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
        // TODO: Backend endpoint to be implemented
        // GET /api/ideation/status
        // Will drive the 22-step progress UI (similar to /api/analysis/status)
        // Returns:
        //   - status: 'pending' | 'in-progress' | 'completed' | 'failed'
        //   - steps: array of 22 technique objects with status
        //   - currentStepIndex: current technique being processed
        //   - currentStepLabel: optional detail label
        //   - error: error message if failed

        const response = await fetch('/api/ideation/status', {
          credentials: 'include'
        })

        if (cancelled) return

        if (response.status === 404) {
          setError('No ideation run found for this session. Please restart.')
          setStatus('failed')
          clearInterval(intervalId)
          return
        }

        if (!response.ok) {
          setError('We are having trouble updating progress. Please try again.')
          setStatus('failed')
          clearInterval(intervalId)
          return
        }

        const data = await response.json()
        const ideation = data.data

        setStatus(ideation.status)
        setSteps(ideation.steps || [])
        setCurrentStepIndex(
          typeof ideation.currentStepIndex === 'number'
            ? ideation.currentStepIndex
            : null
        )
        setCurrentStepLabel(ideation.currentStepLabel || null)
        setError(ideation.error || null)

        if (ideation.status === 'completed') {
          clearInterval(intervalId)
          // TODO: Navigate to /ideation-results page when implemented
          // navigate('/ideation-results')
          // For now, show completion message
        } else if (ideation.status === 'failed') {
          clearInterval(intervalId)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching ideation status:', err)
        setError('We are having trouble updating progress. Please try again.')
        setStatus('failed')
        clearInterval(intervalId)
      }
    }

    // Initialize steps from techniques constant if not loaded
    if (steps.length === 0) {
      const initialSteps = IDEATION_TECHNIQUES.map(technique => ({
        id: technique.id,
        name: technique.name,
        status: 'pending'
      }))
      setSteps(initialSteps)
    }

    // Initial fetch immediately
    fetchStatus()
    // Then poll every 2 seconds (22 techniques may take longer)
    intervalId = setInterval(fetchStatus, 2000)

    return () => {
      cancelled = true
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [navigate])

  const totalSteps = TOTAL_TECHNIQUES
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
      : steps[completedCount]?.name || 'Preparing ideation'

  const handleBackToIdeation = () => {
    navigate('/ideation')
  }

  const handleBackToResults = () => {
    navigate('/results')
  }

  const progressLabelText = `Step ${displayStepNumber} of ${totalSteps}: ${currentStepName}`

  return (
    <div className="ideation-processing-page">
      <div className="ideation-processing-card">
        <header className="ideation-processing-header">
          <h1>Running Ideation &amp; Hypothesis Analysis...</h1>
          <p className="ideation-processing-subtitle">
            Phase 2: We&apos;re running your validated problem statement through {TOTAL_TECHNIQUES} ideation
            and hypothesis techniques. Your problem statement document and prior analysis are being
            passed to each method with technique-specific prompts. This will take several minutes.
          </p>
        </header>

        {error && (
          <div className="ideation-processing-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <section
          className="ideation-processing-progress-section"
          aria-label="Ideation progress"
        >
          <div
            className="ideation-processing-progress-summary"
            aria-live="polite"
          >
            <p className="ideation-processing-step-indicator">
              {progressLabelText}
            </p>
            {currentStepLabel && (
              <p className="ideation-processing-step-label">
                {currentStepLabel}
              </p>
            )}
          </div>

          <div
            className="ideation-processing-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-valuetext={progressLabelText}
          >
            <div
              className="ideation-processing-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="ideation-processing-progress-percent">
            {progressPercent}% complete ({completedCount} of {totalSteps} techniques)
          </div>
        </section>

        <section className="ideation-processing-steps" aria-label="Ideation technique steps">
          <h2>Technique Progress</h2>
          <ul className="ideation-processing-step-list">
            {steps.map(step => (
              <li
                key={step.id}
                className={`ideation-processing-step ideation-processing-step--${step.status}`}
              >
                <span className="ideation-processing-step-status-dot" />
                <span className="ideation-processing-step-name">{step.name}</span>
                <span className="ideation-processing-step-status-text">
                  {step.status === 'pending' && 'Pending'}
                  {step.status === 'in-progress' && 'In progress'}
                  {step.status === 'completed' && 'Completed'}
                  {step.status === 'failed' && 'Failed'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ideation-processing-footer">
          {status === 'in-progress' || status === 'pending' ? (
            <div className="ideation-processing-spinner-wrapper">
              <div className="ideation-processing-spinner" />
              <p className="ideation-processing-spinner-text">
                Please keep this tab open while we complete the ideation analysis. Each technique
                generates a separate analysis document.
              </p>
            </div>
          ) : null}

          {status === 'failed' && (
            <div className="ideation-processing-actions">
              <button
                type="button"
                className="ideation-processing-back-button"
                onClick={handleBackToIdeation}
              >
                Back to Ideation
              </button>
              <button
                type="button"
                className="ideation-processing-secondary-button"
                onClick={handleBackToResults}
              >
                Back to Results
              </button>
            </div>
          )}

          {status === 'completed' && (
            <div className="ideation-processing-actions ideation-processing-actions--completed">
              <div className="ideation-processing-complete-icon">
                <div className="ideation-processing-complete-check" />
              </div>
              <p className="ideation-processing-complete-text">
                All {TOTAL_TECHNIQUES} ideation techniques completed! A pragmatic review will
                summarize the most viable solution concepts.
              </p>
              {/* TODO: Navigate to /ideation-results when implemented */}
              <button
                type="button"
                className="ideation-processing-primary-button"
                onClick={handleBackToResults}
              >
                Back to Results (Ideation Results Coming Soon)
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default IdeationProcessingPage
