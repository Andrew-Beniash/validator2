import { useFormContext } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useFormWizard } from '../context/FormWizardProvider'
import { useState } from 'react'
import './ClarificationFormPage.css'

const TEAM_SIZE_OPTIONS = [
  { value: '', label: 'Select team size' },
  { value: '1-3', label: '1-3 people' },
  { value: '4-10', label: '4-10 people' },
  { value: '11-50', label: '11-50 people' },
  { value: '51-200', label: '51-200 people' },
  { value: '200+', label: '200+ people' }
]

function ClarificationFormPage() {
  const navigate = useNavigate()
  const { register, trigger, formState: { errors } } = useFormContext()
  const { saveToSession } = useFormWizard()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)

    // Validate all clarification fields
    const valid = await trigger([
      'clarification.location',
      'clarification.targetCustomer',
      'clarification.teamSize'
    ])

    if (!valid) {
      // Focus first invalid field
      const firstError = Object.keys(errors.clarification || {})[0]
      if (firstError) {
        document.getElementById(`${firstError}-input`)?.focus()
      }
      return
    }

    try {
      setIsSaving(true)

      // Get current form values (from RHF)
      const values = {
        location: document.getElementById('location-input').value,
        targetCustomer: document.getElementById('targetCustomer-input').value,
        teamSize: document.getElementById('teamSize-input').value
      }

      await saveToSession('clarification', values)
      navigate('/config')
    } catch (error) {
      console.error('Error saving clarification:', error)
      setSaveError("We couldn't save your details right now. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/problem')
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
              className={`text-input ${errors.clarification?.location ? 'invalid' : ''}`}
              {...register('clarification.location', {
                required: 'Please describe where your primary customers or teams are located.',
                minLength: {
                  value: 3,
                  message: 'Location should be at least 3 characters.'
                }
              })}
              placeholder="e.g., US & UK, primarily remote teams in Europe"
              aria-invalid={errors.clarification?.location ? 'true' : 'false'}
            />
            {errors.clarification?.location && (
              <div className="field-error" role="alert">
                {errors.clarification.location.message}
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
              className={`textarea-input ${errors.clarification?.targetCustomer ? 'invalid' : ''}`}
              {...register('clarification.targetCustomer', {
                required: 'Please provide a bit more detail about who your primary customer is.',
                minLength: {
                  value: 20,
                  message: 'Please provide a bit more detail about who your primary customer is.'
                }
              })}
              rows={4}
              placeholder="e.g., HR managers at 200–1000 employee tech companies, or solo founders building their first SaaS product."
              aria-invalid={errors.clarification?.targetCustomer ? 'true' : 'false'}
            />
            {errors.clarification?.targetCustomer && (
              <div className="field-error" role="alert">
                {errors.clarification.targetCustomer.message}
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
              className={`select-input ${errors.clarification?.teamSize ? 'invalid' : ''}`}
              {...register('clarification.teamSize', {
                validate: (value) => value !== '' || 'Please choose a team size range.'
              })}
              aria-invalid={errors.clarification?.teamSize ? 'true' : 'false'}
            >
              {TEAM_SIZE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.clarification?.teamSize && (
              <div className="field-error" role="alert">
                {errors.clarification.teamSize.message}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="actions">
            <button
              type="button"
              className="back-button"
              onClick={handleBack}
            >
              Back
            </button>
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
