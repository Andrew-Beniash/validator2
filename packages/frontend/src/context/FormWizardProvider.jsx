import { createContext, useContext, useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'

const FormWizardContext = createContext(null)

export const useFormWizard = () => {
  const context = useContext(FormWizardContext)
  if (!context) {
    throw new Error('useFormWizard must be used within FormWizardProvider')
  }
  return context
}

export function FormWizardProvider({ children }) {
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [sessionError, setSessionError] = useState(null)

  // Initialize React Hook Form with default values
  const methods = useForm({
    mode: 'onBlur',
    defaultValues: {
      problem: {
        description: ''
      },
      clarification: {
        location: '',
        targetCustomer: '',
        teamSize: ''
      },
      config: {
        email: '',
        provider: 'openai',
        model: 'gpt-4',
        apiKey: ''
      }
    }
  })

  const { reset } = methods

  // Load session data on mount
  useEffect(() => {
    loadSessionData()
  }, [])

  const loadSessionData = async () => {
    try {
      setIsLoadingSession(true)
      setSessionError(null)

      const response = await fetch('/api/session', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const session = data.session

        // Map session data to form structure
        const formData = {
          problem: {
            description: session?.inputs?.problemDescription || session?.inputs?.validationRequest?.description || ''
          },
          clarification: {
            location: session?.inputs?.clarification?.location || '',
            targetCustomer: session?.inputs?.clarification?.targetCustomer || '',
            teamSize: session?.inputs?.clarification?.teamSize || ''
          },
          config: {
            email: session?.apiConfig?.email || '',
            provider: session?.apiConfig?.provider || 'openai',
            model: session?.apiConfig?.model || 'gpt-4',
            apiKey: '' // Never pre-fill API key from session (security)
          }
        }

        // Reset form with session data
        reset(formData)
        console.log('Session loaded successfully:', formData)
      } else {
        console.warn('No active session found:', response.status)
      }
    } catch (error) {
      console.error('Error loading session:', error)
      setSessionError('Failed to load saved data. Starting fresh.')
    } finally {
      setIsLoadingSession(false)
    }
  }

  // Save specific form section to session
  const saveToSession = async (section, data) => {
    try {
      let payload = {}

      switch (section) {
        case 'problem':
          payload = {
            inputs: {
              problemDescription: data.description,
              validationRequest: {
                description: data.description
              }
            }
          }
          break

        case 'clarification':
          payload = {
            inputs: {
              clarification: {
                location: data.location,
                targetCustomer: data.targetCustomer,
                teamSize: data.teamSize
              }
            }
          }
          break

        case 'config':
          // API key intentionally excluded from session storage
          payload = {
            apiConfig: {
              email: data.email,
              provider: data.provider,
              model: data.model
            }
          }
          break

        default:
          throw new Error(`Unknown section: ${section}`)
      }

      const response = await fetch('/api/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`)
      }

      const result = await response.json()
      console.log(`${section} saved to session:`, result)
      return result
    } catch (error) {
      console.error(`Error saving ${section} to session:`, error)
      throw error
    }
  }

  const contextValue = {
    ...methods,
    isLoadingSession,
    sessionError,
    saveToSession,
    reloadSession: loadSessionData
  }

  return (
    <FormWizardContext.Provider value={contextValue}>
      <FormProvider {...methods}>
        {children}
      </FormProvider>
    </FormWizardContext.Provider>
  )
}
