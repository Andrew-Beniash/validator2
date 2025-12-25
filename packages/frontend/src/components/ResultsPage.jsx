import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormWizard } from '../context/FormWizardProvider'
import './ResultsPage.css'

function ResultsPage() {
  const navigate = useNavigate()
  const { watch } = useFormWizard()

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [status, setStatus] = useState(null)
  const [steps, setSteps] = useState([])
  const [emailStatus, setEmailStatus] = useState('idle')
  const [emailError, setEmailError] = useState(null)

  const email = watch('config.email')
  const apiKey = watch('config.apiKey')

  useEffect(() => {
    let cancelled = false

    const fetchStatus = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)

        const response = await fetch('/api/analysis/status', {
          credentials: 'include'
        })

        if (cancelled) return

        if (response.status === 404) {
          setLoadError('No completed analysis found for this session. Please start a new one.')
          setStatus(null)
          setSteps([])
          setIsLoading(false)
          return
        }

        if (!response.ok) {
          setLoadError('We were unable to load your analysis results. Please try again.')
          setStatus(null)
          setSteps([])
          setIsLoading(false)
          return
        }

        const data = await response.json()
        const analysis = data.data

        setStatus(analysis.status)
        setSteps(analysis.steps || [])

        if (analysis.status !== 'completed') {
          navigate('/processing', { replace: true })
          return
        }

        // Analysis is completed; ensure synthesis summary and PDF report exist
        // by calling /api/analysis/synthesize with the in-memory API key.
        if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 20) {
          setLoadError(
            'Analysis is complete, but a valid API key is required to generate your summary report. Please go back to configuration and re-enter your API key.'
          )
          setStatus(analysis.status)
          setIsLoading(false)
          return
        }

        try {
          const synthResponse = await fetch('/api/analysis/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ apiKey })
          })

          if (!synthResponse.ok) {
            const synthData = await synthResponse.json().catch(() => null)
            const message =
              synthData?.error ||
              'We were unable to generate your summary report. Please try again.'
            setLoadError(message)
          }
        } catch (error) {
          console.error('Error synthesizing analysis for results page:', error)
          setLoadError(
            'We were unable to generate your summary report. Please try again.'
          )
        } finally {
          if (!cancelled) {
            setIsLoading(false)
          }
        }
      } catch (error) {
        if (cancelled) return
        console.error('Error loading analysis status for results page:', error)
        setLoadError('We were unable to load your analysis results. Please try again.')
        setStatus(null)
        setSteps([])
        setIsLoading(false)
      }
    }

    fetchStatus()

    return () => {
      cancelled = true
    }
  }, [navigate, apiKey])

  const handleDownload = () => {
    window.open('/api/analysis/report', '_blank', 'noopener,noreferrer')
  }

  const handleSendEmail = async () => {
    setEmailStatus('sending')
    setEmailError(null)

    try {
      const response = await fetch('/api/analysis/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (response.ok) {
        setEmailStatus('sent')
      } else {
        const data = await response.json().catch(() => null)
        const message =
          data?.error ||
          'We could not send the email right now. Please try again.'
        setEmailStatus('error')
        setEmailError(message)
      }
    } catch (error) {
      console.error('Error sending analysis email:', error)
      setEmailStatus('error')
      setEmailError('We could not send the email right now. Please try again.')
    }
  }

  const handleStartNew = () => {
    navigate('/problem')
  }

  const successfulSteps = steps.filter(step => step.status === 'completed')

  return (
    <div className="results-page">
      <div className="results-card">
        {isLoading ? (
          <div className="results-loading">
            <div className="results-spinner" />
            <p>Loading your analysis results...</p>
          </div>
        ) : loadError ? (
          <div className="results-content">
            <div className="results-error" role="alert">
              {loadError}
            </div>
            <div className="results-actions">
              <button
                type="button"
                className="results-primary-button"
                onClick={handleStartNew}
              >
                Start New Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="results-content">
            <div className="results-header">
              <div
                className="results-success-icon"
                aria-hidden="true"
              >
                <div className="results-success-check" />
              </div>
              <h1>Your Problem Validation Report is Ready</h1>
              <p className="results-subtitle">
                We&apos;ve completed the analysis using five complementary frameworks and
                generated a summary report you can download or receive via email.
              </p>
            </div>

            <section className="results-actions" aria-label="Result actions">
              <button
                type="button"
                className="results-primary-button"
                onClick={handleDownload}
              >
                Download PDF Report
              </button>

              <button
                type="button"
                className="results-secondary-button"
                onClick={handleSendEmail}
                disabled={emailStatus === 'sending'}
              >
                {emailStatus === 'sent'
                  ? 'Email Sent'
                  : emailStatus === 'sending'
                    ? 'Sending Email...'
                    : 'Send to my email'}
              </button>

              <button
                type="button"
                className="results-link-button"
                onClick={handleStartNew}
              >
                Start New Analysis
              </button>
            </section>

            {email && (
              <p
                className="results-email-note"
                role="status"
                aria-live="polite"
              >
                We will send a copy to <strong>{email}</strong>.
              </p>
            )}

            {emailStatus === 'error' && emailError && (
              <div className="results-email-error" role="alert">
                <p>{emailError}</p>
                <button
                  type="button"
                  className="results-retry-button"
                  onClick={handleSendEmail}
                >
                  Try again
                </button>
              </div>
            )}

            <section className="results-methods" aria-label="Completed methods">
              <h2>Included Analyses</h2>
              <ul className="results-method-list">
                {successfulSteps.map(step => (
                  <li key={step.id} className="results-method-item">
                    <span className="results-method-check" aria-hidden="true">
                      ✓
                    </span>
                    <span className="results-method-name">{step.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
