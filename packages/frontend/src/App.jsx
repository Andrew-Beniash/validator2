import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('Error fetching from API:', err))
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <h1>Validator Frontend</h1>
        <p>{message || 'Loading...'}</p>
      </header>
    </div>
  )
}

export default App
