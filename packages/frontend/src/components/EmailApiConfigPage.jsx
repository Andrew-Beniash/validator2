import { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useFormWizard } from '../context/FormWizardProvider'
import './EmailApiConfigPage.css'

const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  claude: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
  ]
}

function EmailApiConfigPage() {
  const navigate = useNavigate()
  const { register, watch, setValue, trigger, formState: { errors } } = useFormContext()
  const { saveToSession } = useFormWizard()
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Watch provider to update model options
  const provider = watch('config.provider') || 'openai'
  const model = watch('config.model') || 'gpt-4'

  // Update model when provider changes
  useEffect(() => {
    const availableModels = MODEL_OPTIONS[provider]
    const currentModelValid = availableModels.some(m => m.value === model)

    if (!currentModelValid) {
      setValue('config.model', availableModels[0].value)
    }
  }, [provider, model, setValue])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)

    // Validate all config fields
    const valid = await trigger([
      'config.email',
      'config.provider',
      'config.apiKey',
      'config.model'
    ])

    if (!valid) {
      const firstError = Object.keys(errors.config || {})[0]
      if (firstError) {
        document.getElementById(`${firstError}-input`)?.focus()
      }
      return
    }

    try {
      setIsSaving(true)

      const values = {
        email: watch('config.email'),
        provider: watch('config.provider'),
        model: watch('config.model')
        // API key intentionally excluded from session
      }

      await saveToSession('config', values)

      const apiKey = watch('config.apiKey')

      const payload = {
        problem: {
          description: watch('problem.description')
        },
        clarification: {
          location: watch('clarification.location'),
          targetCustomer: watch('clarification.targetCustomer'),
          teamSize: watch('clarification.teamSize')
        },
        config: {
          email: values.email,
          provider: values.provider,
          model: values.model,
          apiKey
        }
      }

      // Initialize analysis session
      const initResponse = await fetch('/api/analysis/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!initResponse.ok) {
        throw new Error(`Failed to initialize analysis: ${initResponse.status}`)
      }

      // Start analysis run
      const runResponse = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ apiKey })
      })

      if (!runResponse.ok) {
        throw new Error(`Failed to start analysis: ${runResponse.status}`)
      }

      // Navigate to processing view
      navigate('/processing')
    } catch (error) {
      console.error('Error saving config:', error)
      setSaveError("We couldn't save your configuration. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    navigate('/clarification')
  }

  const toggleApiKeyVisibility = () => {
    setShowApiKey(prev => !prev)
  }

  const availableModels = MODEL_OPTIONS[provider] || MODEL_OPTIONS.openai

  return (
    <div className="email-api-config-page">
      <div className="email-api-config-container">
        <header className="page-header">
          <h1>Configure Email & AI Provider</h1>
          <p className="helper-text">
            Provide your email for receiving the validation report and configure
            the AI provider that will analyze your problem. Your API key is used
            only for this session and is never stored permanently.
          </p>
        </header>

        {saveError && (
          <div className="save-error" role="alert" aria-live="polite">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-field">
            <label htmlFor="email-input" className="field-label">
              Notification Email
            </label>
            <p className="field-hint">
              We'll send the final validation report to this address.
              We won't share it with anyone.
            </p>
            <input
              id="email-input"
              type="email"
              className={`text-input ${errors.config?.email ? 'invalid' : ''}`}
              {...register('config.email', {
                required: 'Email is required.',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address.'
                }
              })}
              placeholder="e.g., founder@example.com"
              aria-invalid={errors.config?.email ? 'true' : 'false'}
            />
            {errors.config?.email && (
              <div className="field-error" role="alert">
                {errors.config.email.message}
              </div>
            )}
          </div>

          {/* Provider Selection */}
          <fieldset className="form-field provider-fieldset">
            <legend className="field-label">AI Provider</legend>
            <p className="field-hint">
              Choose which AI service will analyze your problem and generate validation questions.
            </p>
            <div className="radio-group">
              <label className={`radio-option ${provider === 'openai' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="openai"
                  {...register('config.provider', {
                    required: 'Please choose an AI provider.'
                  })}
                />
                <span className="radio-label">OpenAI</span>
              </label>
              <label className={`radio-option ${provider === 'claude' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="claude"
                  {...register('config.provider')}
                />
                <span className="radio-label">Claude</span>
              </label>
            </div>
            {errors.config?.provider && (
              <div className="field-error" role="alert">
                {errors.config.provider.message}
              </div>
            )}
          </fieldset>

          {/* API Key Field */}
          <div className="form-field">
            <label htmlFor="apiKey-input" className="field-label">
              API Key
            </label>
            <p className="field-hint">
              Your {provider === 'openai' ? 'OpenAI' : 'Claude'} API key.
              This is used only for requests within this session and is never stored permanently.
            </p>
            <div className="api-key-wrapper">
              <input
                id="apiKey-input"
                type={showApiKey ? 'text' : 'password'}
                className={`text-input api-key-input ${errors.config?.apiKey ? 'invalid' : ''}`}
                {...register('config.apiKey', {
                  required: 'API key is required.',
                  minLength: {
                    value: 20,
                    message: "This doesn't look like a valid API key. Please double-check and paste again."
                  }
                })}
                placeholder={`Paste your ${provider === 'openai' ? 'OpenAI' : 'Claude'} API key`}
                aria-invalid={errors.config?.apiKey ? 'true' : 'false'}
              />
              <button
                type="button"
                className="toggle-visibility-btn"
                onClick={toggleApiKeyVisibility}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.config?.apiKey && (
              <div className="field-error" role="alert">
                {errors.config.apiKey.message}
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="form-field">
            <label htmlFor="model-input" className="field-label">
              Model
            </label>
            <p className="field-hint">
              Choose the model used for analyzing your problem.
              Different models offer various trade-offs between speed, cost, and capability.
            </p>
            <select
              id="model-input"
              className={`select-input ${errors.config?.model ? 'invalid' : ''}`}
              {...register('config.model', {
                required: 'Please choose a model.'
              })}
              aria-invalid={errors.config?.model ? 'true' : 'false'}
            >
              {availableModels.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.config?.model && (
              <div className="field-error" role="alert">
                {errors.config.model.message}
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

export default EmailApiConfigPage
