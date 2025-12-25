import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { FormWizardProvider } from './context/FormWizardProvider'
import { router } from './router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FormWizardProvider>
      <RouterProvider router={router} />
    </FormWizardProvider>
  </React.StrictMode>
)
