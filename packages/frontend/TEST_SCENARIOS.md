# Problem Input Page - Test Scenarios

## Manual Testing Checklist

### 1. Initial State (Empty)
- [ ] Page loads with empty textarea
- [ ] Character count shows "0 / 2000 characters" in neutral color
- [ ] No validation message shown
- [ ] "Next" button is disabled
- [ ] Textarea has placeholder text visible

### 2. Too Short (< 500 characters)
**Test:** Type 100 characters

- [ ] Character count updates in real-time (e.g., "100 / 2000 characters")
- [ ] Character count shows in red/error color
- [ ] Validation message appears: "Please provide at least 500 characters for enough detail."
- [ ] Validation message has red background
- [ ] Textarea border turns red
- [ ] "Next" button remains disabled

### 3. Valid Range (500-2000 characters)
**Test:** Type/paste exactly 500 characters, then 1000, then 2000

- [ ] At 500 chars: Character count shows "500 / 2000 characters"
- [ ] Character count turns green
- [ ] No validation error message shown
- [ ] Textarea border turns green
- [ ] "Next" button becomes enabled
- [ ] Button hover state works (darker blue, slight lift)
- [ ] Clicking "Next" logs to console

### 4. Too Long (> 2000 characters)
**Test:** Paste 2500 characters

- [ ] Character count shows "2500 / 2000 characters" in red
- [ ] Validation message appears: "Please keep your description under 2000 characters."
- [ ] Textarea border turns red
- [ ] "Next" button becomes disabled
- [ ] Text is NOT truncated (user can still type/edit)

### 5. Boundary Testing
**Test:** Type exactly at boundaries

- [ ] At 499 chars: Button disabled, shows "too short" message
- [ ] At 500 chars: Button enabled, no error message
- [ ] At 2000 chars: Button enabled, no error message
- [ ] At 2001 chars: Button disabled, shows "too long" message

### 6. Edge Cases
**Clear All Test:**
- [ ] Type 1000 characters (valid state)
- [ ] Select all and delete
- [ ] Character count returns to "0 / 2000"
- [ ] No validation message
- [ ] Button becomes disabled
- [ ] No errors/crashes

**Fast Typing/Pasting:**
- [ ] Paste 3000 characters rapidly
- [ ] UI updates immediately
- [ ] No lag or freezing

**Resize Test:**
- [ ] Drag textarea resize handle
- [ ] Textarea resizes vertically
- [ ] Layout remains intact

### 7. Accessibility
**Keyboard Navigation:**
- [ ] Tab to textarea - receives focus with clear outline
- [ ] Tab to "Next" button - receives focus with clear outline
- [ ] Spacebar/Enter on button triggers onClick (when enabled)

**Screen Reader:**
- [ ] Label "Problem Description" is associated with textarea
- [ ] Character count is announced (aria-live="polite")
- [ ] Validation messages are announced (aria-live="assertive")
- [ ] Button disabled state is announced

**Color Independence:**
- [ ] Validation state is clear from text messages, not just color
- [ ] Icons or borders supplement color coding

### 8. Responsive Design
**Desktop (> 768px):**
- [ ] Container max-width: 900px, centered
- [ ] Button aligned to right
- [ ] Comfortable padding and spacing

**Tablet (481px - 768px):**
- [ ] Container adjusts to screen width
- [ ] Font sizes remain readable
- [ ] Button becomes full-width

**Mobile (< 480px):**
- [ ] Textarea height adjusts (fewer rows)
- [ ] Text remains readable (not too small)
- [ ] Touch targets are adequate size (44px minimum)
- [ ] No horizontal scrolling

### 9. Focus States
- [ ] Textarea focus: blue border + shadow
- [ ] Invalid textarea focus: red border + shadow
- [ ] Valid textarea focus: green border + shadow
- [ ] Button focus: outline visible

### 10. Next Button Behavior
**When Disabled (< 500 or > 2000):**
- [ ] Gray background, gray text
- [ ] Cursor: not-allowed
- [ ] No hover effect
- [ ] No click handler fires

**When Enabled (500-2000):**
- [ ] Blue background
- [ ] White text
- [ ] Hover: darker blue, shadow grows, slight lift
- [ ] Active: returns to normal position
- [ ] Click: logs problem text to console

## Sample Test Data

### 100 characters (Too Short)
```
This is a test problem description that is intentionally short to trigger the validation error message.
```

### 500 characters (Minimum Valid)
```
Our retail chain faces a critical inventory management challenge. Store managers across 50 locations manually reconcile stock using Excel, leading to 15% discrepancy rates. This costs us roughly $200K monthly in lost sales and 4 hours per store daily. The root cause is lack of real-time sync between POS and inventory systems. Our target users are store managers and regional supervisors who need instant visibility. We've validated this through 20 interviews showing unanimous frustration. The impact spans 500 employees and 10,000 daily transactions, making this a high-priority operational bottleneck.
```

### 2000 characters (Maximum Valid)
```
Our enterprise SaaS company struggles with customer onboarding efficiency, a problem affecting 50+ new customers monthly and costing an estimated $500K in lost revenue and 1000 support hours quarterly. The core issue is fragmented documentation, unclear setup paths, and manual account configuration requiring 8-12 hours per customer with 3-4 support touchpoints. This creates frustration for customer success managers who spend 60% of their time on repetitive setup tasks instead of strategic engagement, and new customers experience 2-3 week delays before realizing value, leading to 15% churn in the first 90 days. We've validated this through 30 customer interviews, 50 support ticket analyses, and internal team surveys showing onboarding is the #1 pain point. The problem impacts multiple stakeholders: new customers seeking fast time-to-value, customer success teams drowning in manual work, product teams receiving poor initial feedback, and executives concerned about activation rates and expansion revenue. Our hypothesis is that an automated, guided onboarding wizard with role-based paths, integrated documentation, and one-click provisioning would reduce setup time by 70%, decrease support load by 50%, and improve 90-day retention by 20 percentage points. The market opportunity is significant as competitors face similar challenges and a best-in-class onboarding experience could become a key differentiator. We're committed to solving this because it directly impacts our north star metric of time-to-first-value and aligns with our annual goal of improving customer satisfaction scores from 7.2 to 8.5. Success would mean faster revenue recognition, higher customer lifetime value, better team morale, and a sustainable competitive advantage in a crowded market where onboarding experience increasingly determines vendor selection and renewal decisions for our target segment of mid-market B2B companies.
```

### 2500 characters (Too Long)
```
[Paste the 2000 character text above plus additional 500 characters to trigger "too long" validation]
```

## Expected Console Output

When clicking "Next" with valid input (500-2000 chars):
```javascript
Problem submitted: {
  text: "...",
  length: 1234
}
```

## Automated Test Ideas (Future)

```javascript
// Example using React Testing Library
test('disables next button when input is too short', () => {
  render(<ProblemInputPage />)
  const textarea = screen.getByLabelText(/problem description/i)
  const button = screen.getByRole('button', { name: /next/i })

  fireEvent.change(textarea, { target: { value: 'x'.repeat(499) } })

  expect(button).toBeDisabled()
  expect(screen.getByText(/at least 500 characters/i)).toBeInTheDocument()
})

test('enables next button when input is valid', () => {
  render(<ProblemInputPage />)
  const textarea = screen.getByLabelText(/problem description/i)
  const button = screen.getByRole('button', { name: /next/i })

  fireEvent.change(textarea, { target: { value: 'x'.repeat(500) } })

  expect(button).toBeEnabled()
  expect(screen.queryByText(/at least 500 characters/i)).not.toBeInTheDocument()
})
```
