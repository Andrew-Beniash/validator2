import { createBrowserRouter, Navigate } from 'react-router-dom'
import WizardLayout from './components/WizardLayout'
import ProblemInputPage from './components/ProblemInputPage'
import ClarificationFormPage from './components/ClarificationFormPage'
import EmailApiConfigPage from './components/EmailApiConfigPage'
import ProcessingPage from './components/ProcessingPage'
import ResultsPage from './components/ResultsPage'
import IdeationPhasePage from './components/IdeationPhasePage'
import IdeationProcessingPage from './components/IdeationProcessingPage'

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
      },
      {
        path: 'processing',
        element: <ProcessingPage />
      },
      {
        path: 'results',
        element: <ResultsPage />
      },
      {
        path: 'ideation',
        element: <IdeationPhasePage />
      },
      {
        path: 'ideation-processing',
        element: <IdeationProcessingPage />
      }
    ]
  }
])
