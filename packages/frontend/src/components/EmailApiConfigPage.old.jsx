import { useState, useEffect } from 'react'
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

function EmailApiConfigPage({ onNext, onBack }) {
  // Form state
  const [email, setEmail] = useState('')
  const [provider, setProvider] = useState('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4')
  const [showApiKey, setShowApiKey] = useState(false)

  // UI state
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Load session data on mount
  useEffect(() => {
    loadSessionData()
  }, [])

  // Update model when provider changes
  useEffect(() => {
    const availableModels = MODEL_OPTIONS[provider]
    const currentModelValid = availableModels.some(m => m.value === model)

    if (!currentModelValid) {
      // Reset to first model for new provider
      setModel(availableModels[0].value)
      // Clear model error if it exists
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.model
        return newErrors
      })
    }
  }, [provider, model])

  const loadSessionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/session', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const apiConfig = data.session?.apiConfig

        if (apiConfig) {
          // Pre-populate from session (except API key - never pre-fill)
          if (apiConfig.email) setEmail(apiConfig.email)
          if (apiConfig.provider) setProvider(apiConfig.provider)
          if (apiConfig.model) {
            // Ensure model is valid for the provider
            const providerModels = MODEL_OPTIONS[apiConfig.provider || 'openai']
            const modelValid = providerModels.some(m => m.value === apiConfig.model)
            setModel(modelValid ? apiConfig.model : providerModels[0].value)
          }
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
  const validateEmail = (value) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return 'Email is required.'
    }
    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      return 'Please enter a valid email address.'
    }
    return null
  }

  const validateProvider = (value) => {
    if (!value) {
      return 'Please choose an AI provider.'
    }
    return null
  }

  const validateApiKey = (value) => {
    if (!value) {
      return 'API key is required.'
    }
    if (value.length < 20) {
      return "This doesn't look like a valid API key. Please double-check and paste again."
    }
    return null
  }

  const validateModel = (value) => {
    if (!value) {
      return 'Please choose a model.'
    }
    return null
  }

  // Validate all fields
  const validateAll = () => {
    const newErrors = {
      email: validateEmail(email),
      provider: validateProvider(provider),
      apiKey: validateApiKey(apiKey),
      model: validateModel(model)
    }

    // Filter out null errors
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, v]) => v !== null)
    )

    setErrors(filteredErrors)
    return Object.keys(filteredErrors).length === 0
  }

  // Field change handlers
  const handleEmailChange = (e) => {
    const value = e.target.value
    setEmail(value)
    if (touched.email) {
      const error = validateEmail(value)
      setErrors(prev => ({ ...prev, email: error }))
    }
  }

  const handleProviderChange = (e) => {
    const value = e.target.value
    setProvider(value)
    if (touched.provider) {
      const error = validateProvider(value)
      setErrors(prev => ({ ...prev, provider: error }))
    }
  }

  const handleApiKeyChange = (e) => {
    const value = e.target.value
    setApiKey(value)
    if (touched.apiKey) {
      const error = validateApiKey(value)
      setErrors(prev => ({ ...prev, apiKey: error }))
    }
  }

  const handleModelChange = (e) => {
    const value = e.target.value
    setModel(value)
    if (touched.model) {
      const error = validateModel(value)
      setErrors(prev => ({ ...prev, model: error }))
    }
  }

  // Blur handlers
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))

    let error = null
    switch (field) {
      case 'email':
        error = validateEmail(email)
        break
      case 'provider':
        error = validateProvider(provider)
        break
      case 'apiKey':
        error = validateApiKey(apiKey)
        break
      case 'model':
        error = validateModel(model)
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

  // Toggle API key visibility
  const toggleApiKeyVisibility = () => {
    setShowApiKey(prev => !prev)
  }

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaveError(null)

    // Validate all fields
    const isValid = validateAll()
    if (!isValid) {
      // Focus first invalid field
      const firstError = ['email', 'provider', 'apiKey', 'model'].find(
        field => errors[field]
      )
      if (firstError) {
        document.getElementById(`${firstError}-input`)?.focus()
      }
      return
    }

    // Save to session
    try {
      setIsSubmitting(true)

      // SECURITY NOTE: For production, API key should NOT be stored in session.
      // Instead, send it only to the validation endpoint when needed.
      // For this task, we exclude apiKey from session storage per security guidance.
      const response = await fetch('/api/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          apiConfig: {
            email: email.trim(),
            provider,
            model
            // NOTE: apiKey intentionally excluded - never store API keys in session
            // It will be sent directly to validation endpoint when needed
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }

      const data = await response.json()
      console.log('API config saved:', data)

      // TODO: Wire up navigation to Page 4 or validation endpoint in future task
      if (onNext) {
        onNext({ email, provider, apiKey, model })
      } else {
        console.log('Next callback not provided - add routing later')
        console.log('API Key (not stored):', apiKey.substring(0, 10) + '...')
      }
    } catch (error) {
      console.error('Error saving API config:', error)
      setSaveError("We couldn't save your configuration. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="email-api-config-page">
        <div className="email-api-config-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your configuration...</p>
          </div>
        </div>
      </div>
    )
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
              className={`text-input ${errors.email ? 'invalid' : ''}`}
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              placeholder="e.g., founder@example.com"
              aria-describedby={errors.email ? 'email-error' : 'email-hint'}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <div id="email-error" className="field-error" role="alert">
                {errors.email}
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
                  name="provider"
                  value="openai"
                  checked={provider === 'openai'}
                  onChange={handleProviderChange}
                  onBlur={() => handleBlur('provider')}
                  aria-invalid={errors.provider ? 'true' : 'false'}
                />
                <span className="radio-label">OpenAI</span>
              </label>
              <label className={`radio-option ${provider === 'claude' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="claude"
                  checked={provider === 'claude'}
                  onChange={handleProviderChange}
                  onBlur={() => handleBlur('provider')}
                  aria-invalid={errors.provider ? 'true' : 'false'}
                />
                <span className="radio-label">Claude</span>
              </label>
            </div>
            {errors.provider && (
              <div className="field-error" role="alert">
                {errors.provider}
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
                className={`text-input api-key-input ${errors.apiKey ? 'invalid' : ''}`}
                value={apiKey}
                onChange={handleApiKeyChange}
                onBlur={() => handleBlur('apiKey')}
                placeholder={`Paste your ${provider === 'openai' ? 'OpenAI' : 'Claude'} API key`}
                aria-describedby={errors.apiKey ? 'apiKey-error' : 'apiKey-hint'}
                aria-invalid={errors.apiKey ? 'true' : 'false'}
              />
              <button
                type="button"
                className="toggle-visibility-btn"
                onClick={toggleApiKeyVisibility}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                tabIndex={0}
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
            {errors.apiKey && (
              <div id="apiKey-error" className="field-error" role="alert">
                {errors.apiKey}
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
              className={`select-input ${errors.model ? 'invalid' : ''}`}
              value={model}
              onChange={handleModelChange}
              onBlur={() => handleBlur('model')}
              aria-describedby={errors.model ? 'model-error' : 'model-hint'}
              aria-invalid={errors.model ? 'true' : 'false'}
            >
              {availableModels.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.model && (
              <div id="model-error" className="field-error" role="alert">
                {errors.model}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="actions">
            {onBack && (
              <button
                type="button"
                className="back-button"
                onClick={onBack}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="next-button"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailApiConfigPage
