import { useState } from 'react'
import './ProblemInputPage.css'

const MIN_CHARS = 500
const MAX_CHARS = 2000

function ProblemInputPage() {
  const [problemText, setProblemText] = useState('')

  // Derived validation state
  const charCount = problemText.length
  const isTooShort = charCount > 0 && charCount < MIN_CHARS
  const isTooLong = charCount > MAX_CHARS
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS
  const isEmpty = charCount === 0

  // Determine validation message
  const getValidationMessage = () => {
    if (isEmpty) return null
    if (isTooShort) return 'Please provide at least 500 characters for enough detail.'
    if (isTooLong) return 'Please keep your description under 2000 characters.'
    return null
  }

  // Determine validation state for styling
  const getValidationState = () => {
    if (isEmpty) return 'neutral'
    if (isValid) return 'valid'
    return 'invalid'
  }

  const handleTextChange = (e) => {
    setProblemText(e.target.value)
  }

  const handleNext = () => {
    if (!isValid) return

    // TODO: Wire up navigation to Page 2 in future task
    console.log('Problem submitted:', {
      text: problemText,
      length: charCount
    })

    // Placeholder for future navigation/callback
    // Example: onNext(problemText)
    // Example: navigate('/page-2', { state: { problem: problemText } })
  }

  const validationMessage = getValidationMessage()
  const validationState = getValidationState()

  return (
    <div className="problem-input-page">
      <div className="problem-input-container">
        <header className="page-header">
          <h1>Describe Your Problem</h1>
          <p className="helper-text">
            Share the problem you're facing in detail. Include the context, who it affects,
            and why it matters. This helps us validate whether it's worth solving.
          </p>
        </header>

        <div className="input-section">
          <label htmlFor="problem-textarea" className="textarea-label">
            Problem Description
          </label>

          <textarea
            id="problem-textarea"
            className={`problem-textarea ${validationState}`}
            value={problemText}
            onChange={handleTextChange}
            rows={12}
            placeholder="Example: Our small business clients struggle to track inventory across multiple locations. They currently use spreadsheets, which leads to stock discrepancies and lost sales. Store managers spend 3+ hours daily reconciling counts manually. This affects 200+ retail locations and costs an estimated $50K monthly in lost revenue and labor. We need a simple, real-time inventory sync solution that doesn't require expensive hardware or complex training."
            aria-describedby="char-count validation-message"
          />

          <div className="feedback-section">
            <div
              id="char-count"
              className={`char-count ${validationState}`}
              aria-live="polite"
            >
              {charCount} / {MAX_CHARS} characters
            </div>

            {validationMessage && (
              <div
                id="validation-message"
                className={`validation-message ${validationState}`}
                role="alert"
                aria-live="assertive"
              >
                {validationMessage}
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            className="next-button"
            onClick={handleNext}
            disabled={!isValid}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProblemInputPage
