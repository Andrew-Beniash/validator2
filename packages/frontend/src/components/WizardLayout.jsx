import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useFormWizard } from '../context/FormWizardProvider'
import StepsPanel from './StepsPanel'
import './WizardLayout.css'

function WizardLayout() {
  const location = useLocation()
  const { isLoadingSession, sessionError } = useFormWizard()

  // Scroll to top and focus main content on route change
  useEffect(() => {
    window.scrollTo(0, 0)

    // Focus the main heading for accessibility
    const heading = document.querySelector('h1')
    if (heading) {
      heading.focus({ preventScroll: true })
      heading.setAttribute('tabindex', '-1')
    }
  }, [location.pathname])

  // Show global loading state while loading session
  if (isLoadingSession) {
    return (
      <div className="wizard-layout">
        <div className="wizard-loading">
          <div className="loading-spinner-large"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard-layout">
      <StepsPanel />
      <main className="wizard-main">
        {sessionError && (
          <div className="wizard-error" role="alert">
            {sessionError}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export default WizardLayout
