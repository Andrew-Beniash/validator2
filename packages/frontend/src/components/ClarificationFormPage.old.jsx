import { useState, useEffect } from 'react'
import './ClarificationFormPage.css'

const TEAM_SIZE_OPTIONS = [
  { value: '', label: 'Select team size' },
  { value: '1-3', label: '1-3 people' },
  { value: '4-10', label: '4-10 people' },
  { value: '11-50', label: '11-50 people' },
  { value: '51-200', label: '51-200 people' },
  { value: '200+', label: '200+ people' }
]

function ClarificationFormPage({ onNext }) {
  // Form state
  const [location, setLocation] = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [teamSize, setTeamSize] = useState('')

  // UI state
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Load session data on mount
  useEffect(() => {
    loadSessionData()
  }, [])

  const loadSessionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/session', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const clarification = data.session?.inputs?.clarification

        if (clarification) {
          setLocation(clarification.location || '')
          setTargetCustomer(clarification.targetCustomer || '')
          setTeamSize(clarification.teamSize || '')
        }
      } else {
        console.warn('Failed to load session:', response.status)
      }
    } catch (error) {
      console.error('Error loading session data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Validation functions
  const validateLocation = (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return 'Please describe where your primary customers or teams are located.'
    }
    if (trimmed.length < 3) {
      return 'Location should be at least 3 characters.'
    }
    return null
  }

  const validateTargetCustomer = (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return 'Please provide a bit more detail about who your primary customer is.'
    }
    if (trimmed.length < 20) {
      return 'Please provide a bit more detail about who your primary customer is.'
    }
    return null
  }

  const validateTeamSize = (value) => {
    if (!value || value === '') {
      return 'Please choose a team size range.'
    }
    return null
  }

  // Validate all fields
  const validateAll = () => {
    const newErrors = {
      location: validateLocation(location),
      targetCustomer: validateTargetCustomer(targetCustomer),
      teamSize: validateTeamSize(teamSize)
    }

    // Filter out null errors
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, v]) => v !== null)
    )

    setErrors(filteredErrors)
    return Object.keys(filteredErrors).length === 0
  }

  // Field change handlers
  const handleLocationChange = (e) => {
    const value = e.target.value
    setLocation(value)
    if (touched.location) {
      const error = validateLocation(value)
      setErrors(prev => ({ ...prev, location: error }))
    }
  }

  const handleTargetCustomerChange = (e) => {
    const value = e.target.value
    setTargetCustomer(value)
    if (touched.targetCustomer) {
      const error = validateTargetCustomer(value)
      setErrors(prev => ({ ...prev, targetCustomer: error }))
    }
  }

  const handleTeamSizeChange = (e) => {
    const value = e.target.value
    setTeamSize(value)
    if (touched.teamSize) {
      const error = validateTeamSize(value)
      setErrors(prev => ({ ...prev, teamSize: error }))
    }
  }

  // Blur handlers
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))

    let error = null
    switch (field) {
      case 'location':
        error = validateLocation(location)
        break
      case 'targetCustomer':
        error = validateTargetCustomer(targetCustomer)
        break
      case 'teamSize':
        error = validateTeamSize(teamSize)
        break
      default:
        break
    }

    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)

    // Validate all fields
    const isValid = validateAll()
    if (!isValid) {
      // Focus first invalid field
      const firstError = ['location', 'targetCustomer', 'teamSize'].find(
        field => errors[field]
      )
      if (firstError) {
        document.getElementById(`${firstError}-input`)?.focus()
      }
      return
    }

    // Save to session
    try {
      setIsSaving(true)

      const response = await fetch('/api/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          inputs: {
            clarification: {
              location: location.trim(),
              targetCustomer: targetCustomer.trim(),
              teamSize
            }
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }

      const data = await response.json()
      console.log('Clarification data saved:', data)

      // TODO: Wire up navigation to Page 3 in future task
      if (onNext) {
        onNext({ location, targetCustomer, teamSize })
      } else {
        console.log('Next callback not provided - add routing later')
      }
    } catch (error) {
      console.error('Error saving clarification:', error)
      setSaveError("We couldn't save your details right now. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="clarification-form-page">
        <div className="clarification-form-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your session...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="clarification-form-page">
      <div className="clarification-form-container">
        <header className="page-header">
          <h1>Clarify Your Context</h1>
          <p className="helper-text">
            Help us understand your market and team. These details ensure we're validating
            the right assumptions for your specific situation.
          </p>
        </header>

        {saveError && (
          <div className="save-error" role="alert">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Location Field */}
          <div className="form-field">
            <label htmlFor="location-input" className="field-label">
              Primary Location(s)
            </label>
            <p className="field-hint">
              Where are your primary customers or teams located? This can be geographic
              regions, countries, or "remote/distributed".
            </p>
            <input
              id="location-input"
              type="text"
              className={`text-input ${errors.location ? 'invalid' : ''}`}
              value={location}
              onChange={handleLocationChange}
              onBlur={() => handleBlur('location')}
              placeholder="e.g., US & UK, primarily remote teams in Europe"
              aria-describedby={errors.location ? 'location-error' : undefined}
              aria-invalid={errors.location ? 'true' : 'false'}
            />
            {errors.location && (
              <div id="location-error" className="field-error" role="alert">
                {errors.location}
              </div>
            )}
          </div>

          {/* Target Customer Field */}
          <div className="form-field">
            <label htmlFor="targetCustomer-input" className="field-label">
              Target Customer
            </label>
            <p className="field-hint">
              Describe your ideal customer: their role, company size, industry, and key needs.
              If the buyer differs from the user, mention both.
            </p>
            <textarea
              id="targetCustomer-input"
              className={`textarea-input ${errors.targetCustomer ? 'invalid' : ''}`}
              value={targetCustomer}
              onChange={handleTargetCustomerChange}
              onBlur={() => handleBlur('targetCustomer')}
              rows={4}
              placeholder="e.g., HR managers at 200–1000 employee tech companies, or solo founders building their first SaaS product."
              aria-describedby={errors.targetCustomer ? 'targetCustomer-error' : undefined}
              aria-invalid={errors.targetCustomer ? 'true' : 'false'}
            />
            {errors.targetCustomer && (
              <div id="targetCustomer-error" className="field-error" role="alert">
                {errors.targetCustomer}
              </div>
            )}
          </div>

          {/* Team Size Field */}
          <div className="form-field">
            <label htmlFor="teamSize-input" className="field-label">
              Team Size Working on This
            </label>
            <p className="field-hint">
              How many people are working on solving this problem with you?
              Include founders, employees, and active contributors.
            </p>
            <select
              id="teamSize-input"
              className={`select-input ${errors.teamSize ? 'invalid' : ''}`}
              value={teamSize}
              onChange={handleTeamSizeChange}
              onBlur={() => handleBlur('teamSize')}
              aria-describedby={errors.teamSize ? 'teamSize-error' : undefined}
              aria-invalid={errors.teamSize ? 'true' : 'false'}
            >
              {TEAM_SIZE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.teamSize && (
              <div id="teamSize-error" className="field-error" role="alert">
                {errors.teamSize}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="actions">
            <button
              type="submit"
              className="next-button"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClarificationFormPage
