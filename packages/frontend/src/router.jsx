import { createBrowserRouter, Navigate } from 'react-router-dom'
import WizardLayout from './components/WizardLayout'
import ProblemInputPage from './components/ProblemInputPage'
import ClarificationFormPage from './components/ClarificationFormPage'
import EmailApiConfigPage from './components/EmailApiConfigPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WizardLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/problem" replace />
      },
      {
        path: 'problem',
        element: <ProblemInputPage />
      },
      {
        path: 'clarification',
        element: <ClarificationFormPage />
      },
      {
        path: 'config',
        element: <EmailApiConfigPage />
      }
    ]
  }
])
