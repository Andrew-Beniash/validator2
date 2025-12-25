# Components

This directory contains reusable React components for the Validator application.

## Components

### ProblemInputPage
**Location**: `ProblemInputPage.jsx`

A full-page component for collecting problem descriptions from users.

**Features:**
- Character validation (500-2000 characters)
- Real-time character counting
- Visual validation feedback
- Accessible form design
- Responsive layout

**Usage:**
```jsx
import ProblemInputPage from './components/ProblemInputPage'

function App() {
  return <ProblemInputPage />
}
```

**Props:** None (self-contained)

**State:** Manages `problemText` internally

**Future Props:**
```jsx
// When adding navigation/callbacks
<ProblemInputPage
  onNext={(problemText) => { /* handle submission */ }}
  initialValue=""
/>
```

---

### ClarificationFormPage
**Location**: `ClarificationFormPage.jsx`

A form component for collecting context details (location, target customer, team size) with session storage integration.

**Features:**
- Three validated form fields (location, target customer, team size)
- Session storage integration (GET/PUT /api/session)
- Real-time validation on change, blur, and submit
- Loading states and error handling
- Accessible form design with ARIA attributes
- Responsive layout

**Usage:**
```jsx
import ClarificationFormPage from './components/ClarificationFormPage'

function App() {
  return <ClarificationFormPage />
}
```

**Props:**
- `onNext?: (data) => void` - Optional callback when form is successfully submitted

**State:** Manages form fields, validation errors, loading, and saving states internally

**Session Integration:**
- Loads existing data from `GET /api/session` on mount
- Saves data to `PUT /api/session` on submit
- Pre-populates fields with saved session data

**Example with callback:**
```jsx
<ClarificationFormPage
  onNext={(data) => {
    console.log('Saved:', data)
    // Navigate to next page
  }}
/>
```

---

### EmailApiConfigPage
**Location**: `EmailApiConfigPage.jsx`

A configuration form for email and AI provider setup (OpenAI/Claude) with dynamic model selection and session storage integration.

**Features:**
- Four validated form fields (email, provider, API key, model)
- Dynamic model dropdown (updates based on provider selection)
- API key masking with show/hide toggle
- Session storage integration (GET/PUT /api/session)
- Real-time validation on change, blur, and submit
- Loading states and error handling
- Accessible form design with ARIA attributes and fieldset
- Responsive layout with radio group styling
- **Security**: API key never stored in session (passed only to callback)

**Usage:**
```jsx
import EmailApiConfigPage from './components/EmailApiConfigPage'

function App() {
  return <EmailApiConfigPage />
}
```

**Props:**
- `onNext?: (data) => void` - Optional callback when configuration is saved
  - `data`: `{ email, provider, apiKey, model }`
- `onBack?: () => void` - Optional callback for back button

**State:** Manages form fields (email, provider, apiKey, model), validation errors, API key visibility, loading, and saving states internally

**Session Integration:**
- Loads existing config from `GET /api/session` on mount
- Saves email, provider, and model to `PUT /api/session` on submit
- **Security**: API key excluded from session (never stored)
- Pre-populates email, provider, and model from session

**Model Options:**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Claude**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- Model list updates dynamically when provider changes

**Example with callbacks:**
```jsx
<EmailApiConfigPage
  onNext={(config) => {
    console.log('API Config:', config)
    // config.apiKey available for validation request
    // Navigate to validation page
  }}
  onBack={() => {
    // Navigate back to clarification page
  }}
/>
```

## Component Guidelines

When adding new components to this directory:

1. **File Naming**: Use PascalCase (e.g., `MyComponent.jsx`)
2. **Styling**: Co-locate styles (e.g., `MyComponent.css`)
3. **Exports**: Use default exports for components
4. **Documentation**: Add JSDoc comments for props
5. **Accessibility**: Include ARIA labels and semantic HTML
6. **Responsive**: Test on mobile, tablet, and desktop

## Style Guide

- Use functional components with hooks
- Prefer controlled components for forms
- Derive state when possible (don't duplicate)
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use semantic HTML elements
- Include accessibility features by default
