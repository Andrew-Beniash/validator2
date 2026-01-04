import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormWizard } from '../context/FormWizardProvider'
import { IDEATION_TECHNIQUES, TOTAL_TECHNIQUES } from '../constants/ideationTechniques'
import './IdeationPhasePage.css'

function IdeationPhasePage() {
  const navigate = useNavigate()
  const { watch } = useFormWizard()

  const [isLoading, setIsLoading] = useState(true)
  const [validationError, setValidationError] = useState(null)
  const [hasCompletedValidation, setHasCompletedValidation] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  const problemDescription = watch('problem.description')
  const location = watch('clarification.location')
  const targetCustomer = watch('clarification.targetCustomer')
  const teamSize = watch('clarification.teamSize')
  const apiKey = watch('config.apiKey')
  const provider = watch('config.provider')
  const model = watch('config.model')

  // Validate that user has completed problem validation phase
  useEffect(() => {
    let cancelled = false

    const validateAccess = async () => {
      try {
        setIsLoading(true)
        setValidationError(null)

        const response = await fetch('/api/analysis/status', {
          credentials: 'include'
        })

        if (cancelled) return

        if (response.status === 404) {
          setValidationError('No validation session found.')
          setHasCompletedValidation(false)
          setIsLoading(false)
          return
        }

        if (!response.ok) {
          setValidationError('Unable to verify validation status.')
          setHasCompletedValidation(false)
          setIsLoading(false)
          return
        }

        const data = await response.json()
        const analysis = data.data

        if (analysis.status !== 'completed') {
          setValidationError('Problem validation is not yet complete.')
          setHasCompletedValidation(false)
          setIsLoading(false)
          return
        }

        // Validation is completed
        setHasCompletedValidation(true)
        setIsLoading(false)
      } catch (error) {
        if (cancelled) return
        console.error('Error validating access to ideation phase:', error)
        setValidationError('Unable to verify validation status.')
        setHasCompletedValidation(false)
        setIsLoading(false)
      }
    }

    validateAccess()

    return () => {
      cancelled = true
    }
  }, [])

  const handleBackToResults = () => {
    navigate('/results')
  }

  const handleStartNew = () => {
    navigate('/problem')
  }

  const handleGoToConfig = () => {
    navigate('/config')
  }

  // Determine button state and validation messages
  const getButtonState = () => {
    if (!problemDescription || problemDescription.trim().length === 0) {
      return {
        disabled: true,
        reason: 'Problem description is required to run ideation.'
      }
    }

    if (!hasCompletedValidation) {
      return {
        disabled: true,
        reason: 'Complete the Problem Validation phase first to unlock Ideation.'
      }
    }

    if (!apiKey || apiKey.length < 20) {
      return {
        disabled: true,
        reason: 'A valid API key is required to run ideation.',
        showConfigLink: true
      }
    }

    if (isStarting) {
      return {
        disabled: true,
        reason: 'Starting ideation...'
      }
    }

    return { disabled: false, reason: null }
  }

  const handleRunIdeation = async () => {
    // Clear any prior errors
    setStartError(null)
    setIsStarting(true)

    try {
      // Execute SCAMPER ideation technique
      const response = await fetch('/api/ideation/scamper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          apiKey
        })
      })

      if (response.ok || response.status === 202) {
        // Navigate to processing page
        navigate('/ideation-processing')
      } else {
        // Handle error
        const errorData = await response.json().catch(() => null)
        const message =
          errorData?.error ||
          'We could not start ideation. Please check your API key and try again.'

        console.error('Ideation start failed:', {
          status: response.status,
          message
        })

        setStartError(message)
        setIsStarting(false)
      }
    } catch (error) {
      console.error('Error starting ideation:', error)
      setStartError('We could not start ideation. Please check your API key and try again.')
      setIsStarting(false)
    }
  }

  const buttonState = getButtonState()

  return (
    <div className="ideation-page">
      <div className="ideation-card">
        {isLoading ? (
          <div className="ideation-loading">
            <div className="ideation-spinner" />
            <p>Verifying validation status...</p>
          </div>
        ) : !hasCompletedValidation ? (
          <div className="ideation-content">
            <div className="ideation-error" role="alert">
              <h1>Ideation Not Available</h1>
              <p>
                Ideation is available after completing problem validation.
                {validationError && ` ${validationError}`}
              </p>
            </div>
            <div className="ideation-error-actions">
              <button
                type="button"
                className="ideation-primary-button"
                onClick={handleBackToResults}
              >
                Back to Results
              </button>
              <button
                type="button"
                className="ideation-link-button"
                onClick={handleStartNew}
              >
                Start New Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="ideation-content">
            <header className="ideation-header">
              <h1>Ideation &amp; Hypothesis Formation</h1>
              <p className="ideation-subtitle">
                Phase 2: This phase builds on your validated problem statement. We&apos;ll run your
                problem through {TOTAL_TECHNIQUES} ideation and hypothesis techniques to generate
                creative solutions and testable approaches.
              </p>
            </header>

            <section
              className="ideation-context"
              aria-label="Validated problem statement"
            >
              <h2>Validated Problem Context</h2>
              <div className="ideation-context-content">
                <div className="ideation-context-item">
                  <strong>Problem Statement:</strong>
                  <p>{problemDescription || 'No problem description provided.'}</p>
                </div>
                {location && (
                  <div className="ideation-context-detail">
                    <strong>Location:</strong> {location}
                  </div>
                )}
                {targetCustomer && (
                  <div className="ideation-context-detail">
                    <strong>Target Customer:</strong> {targetCustomer}
                  </div>
                )}
                {teamSize && (
                  <div className="ideation-context-detail">
                    <strong>Team Size:</strong> {teamSize}
                  </div>
                )}
              </div>
            </section>

            <section
              className="ideation-techniques"
              aria-label="Planned ideation techniques"
            >
              <h2>Planned Ideation Techniques ({TOTAL_TECHNIQUES} Methods)</h2>
              <div className="ideation-techniques-grid">
                {IDEATION_TECHNIQUES.map(technique => (
                  <div key={technique.id} className="ideation-technique-card">
                    <h3>{technique.name}</h3>
                    <p className="ideation-technique-description">
                      {technique.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Run Ideation Button */}
              <div className="ideation-run-section">
                <button
                  type="button"
                  className="ideation-run-button"
                  onClick={handleRunIdeation}
                  disabled={buttonState.disabled}
                  aria-disabled={buttonState.disabled}
                >
                  {isStarting ? (
                    <>
                      <span className="ideation-button-spinner" />
                      Starting Ideation...
                    </>
                  ) : (
                    `Run Ideation & Hypothesis Analysis (${TOTAL_TECHNIQUES} Techniques)`
                  )}
                </button>

                {!isStarting && !buttonState.disabled && (
                  <p className="ideation-run-helper">
                    We&apos;ll use your validated problem statement to run {TOTAL_TECHNIQUES} ideation
                    and hypothesis techniques. Each method will generate a separate analysis you can
                    review later.
                  </p>
                )}

                {isStarting && (
                  <p className="ideation-run-helper ideation-run-starting">
                    This can take a few minutes. You can monitor progress on the next screen.
                  </p>
                )}

                {buttonState.reason && !isStarting && (
                  <div className="ideation-validation-warning" role="alert">
                    <p>{buttonState.reason}</p>
                    {buttonState.showConfigLink && (
                      <button
                        type="button"
                        className="ideation-config-link"
                        onClick={handleGoToConfig}
                      >
                        Go to Configuration Page
                      </button>
                    )}
                  </div>
                )}

                {startError && (
                  <div className="ideation-start-error" role="alert">
                    <p>{startError}</p>
                    <button
                      type="button"
                      className="ideation-retry-button"
                      onClick={handleRunIdeation}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </section>

            <nav className="ideation-navigation" aria-label="Page navigation">
              <button
                type="button"
                className="ideation-back-button"
                onClick={handleBackToResults}
              >
                &larr; Back to Results
              </button>
              <button
                type="button"
                className="ideation-link-button"
                onClick={handleStartNew}
              >
                Start New Analysis
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  )
}

export default IdeationPhasePage
