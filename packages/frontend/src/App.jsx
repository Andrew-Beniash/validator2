import './App.css'
import ProblemInputPage from './components/ProblemInputPage'
import ClarificationFormPage from './components/ClarificationFormPage'
import EmailApiConfigPage from './components/EmailApiConfigPage'

function App() {
  // TODO: Replace with proper routing (React Router)
  // For now, switch between pages by changing the component below
  const currentPage = 'email-api-config' // 'problem' | 'clarification' | 'email-api-config'

  return (
    <div className="App">
      {currentPage === 'problem' && <ProblemInputPage />}
      {currentPage === 'clarification' && <ClarificationFormPage />}
      {currentPage === 'email-api-config' && <EmailApiConfigPage />}
    </div>
  )
}

export default App
