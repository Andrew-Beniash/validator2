# Page 2 - Clarification Form - Testing Guide

## Quick Start Testing

### 1. Start the Servers

**Terminal 1 - Backend:**
```bash
cd "/Volumes/S Drive/validator"
npm run start:backend
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd "/Volumes/S Drive/validator"
npm run start:frontend
# App runs on http://localhost:3001
```

### 2. Switch to Page 2

Edit [src/App.jsx](src/App.jsx:8):
```javascript
const currentPage = 'clarification' // Change to 'clarification'
```

### 3. Open Browser

Navigate to: `http://localhost:3001`

## Test Scenarios

### Scenario 1: Initial Load with No Session

**Setup:**
- Clear browser cookies
- Start fresh

**Expected:**
- Shows loading spinner briefly
- Form appears with empty fields
- No errors shown
- "Save & Continue" button visible

**Console:**
```
Failed to load session: 404 (or similar)
```

### Scenario 2: Initial Load with Existing Session

**Setup:**
1. Fill out and submit the form once
2. Refresh the page

**Expected:**
- Shows loading spinner briefly
- Form fields pre-populated with saved data
- No errors shown
- Can edit and re-save

**Console:**
```
(No errors, successful session load)
```

### Scenario 3: Location Field Validation

**Test Cases:**

| Input | Expected Result |
|-------|----------------|
| Empty field → blur | Red border, error: "Please describe where..." |
| "US" (2 chars) → blur | Red border, error: "Location should be at least 3 characters" |
| "USA" (3 chars) → blur | No error, border normal |
| Type "U" → error shows → type "SA" | Error clears automatically |

### Scenario 4: Target Customer Validation

**Test Cases:**

| Input | Expected Result |
|-------|----------------|
| Empty field → blur | Red border, error: "Please provide a bit more detail..." |
| "HR managers" (11 chars) → blur | Red border, error: "Please provide a bit more detail..." |
| 20+ character description → blur | No error, border normal |

**Example Valid Input (20+ chars):**
```
HR managers at tech companies with 200-500 employees
```

### Scenario 5: Team Size Validation

**Test Cases:**

| Selection | Expected Result |
|-----------|----------------|
| "Select team size" → blur | Red border, error: "Please choose a team size range" |
| Any range (1-3, 4-10, etc.) | No error, border normal |

### Scenario 6: Form Submission - All Invalid

**Steps:**
1. Leave all fields empty or invalid
2. Click "Save & Continue"

**Expected:**
- All three error messages appear
- Focus moves to first invalid field (Location)
- Form does NOT submit
- No API call made

**Console:**
```
(No API calls)
```

### Scenario 7: Form Submission - Partial Valid

**Steps:**
1. Fill Location: "USA"
2. Leave Target Customer empty
3. Select Team Size: "4-10"
4. Click "Save & Continue"

**Expected:**
- Target Customer shows error
- Focus moves to Target Customer field
- Form does NOT submit
- No API call made

### Scenario 8: Form Submission - All Valid (Success)

**Steps:**
1. Fill Location: "USA & Canada, primarily remote"
2. Fill Target Customer: "HR managers at 200-500 employee tech companies in B2B SaaS"
3. Select Team Size: "4-10"
4. Click "Save & Continue"

**Expected:**
- Button changes to "Saving..."
- Button becomes disabled
- After ~100-500ms, console logs success
- No error banner appears

**Console:**
```
Clarification data saved: {
  success: true,
  sessionId: "...",
  session: { ... }
}
```

**Network Tab:**
```
PUT /api/session
Status: 200
Request:
{
  "inputs": {
    "clarification": {
      "location": "USA & Canada, primarily remote",
      "targetCustomer": "HR managers at 200-500 employee tech companies in B2B SaaS",
      "teamSize": "4-10"
    }
  }
}
```

### Scenario 9: Form Submission - Network Error

**Steps:**
1. Stop the backend server
2. Fill all fields validly
3. Click "Save & Continue"

**Expected:**
- Button shows "Saving..." briefly
- After timeout, error banner appears at top:
  - "We couldn't save your details right now. Please try again."
  - Red background, left border
- Form values preserved (not cleared)
- Can edit and retry

**Console:**
```
Error saving clarification: [Error details]
```

### Scenario 10: Form Submission - Server Error (500)

**Setup:**
Temporarily modify backend to return 500 error

**Expected:**
- Same as Scenario 9
- Error banner appears
- Form values preserved

### Scenario 11: Edit After Save

**Steps:**
1. Submit form successfully
2. Refresh page
3. Edit Location field
4. Submit again

**Expected:**
- Form loads with previous values
- Can edit any field
- Re-submission updates session
- New values appear on next refresh

### Scenario 12: Real-time Validation

**Steps:**
1. Click in Location field
2. Type "U" → blur → see error
3. Click back in Location field
4. Type "S" (now "US") → error still shows
5. Type "A" (now "USA") → error disappears immediately

**Expected:**
- Error appears on blur
- Error clears on change once field becomes valid
- No need to blur again

### Scenario 13: Keyboard Navigation

**Steps:**
1. Click anywhere on page
2. Press Tab repeatedly

**Expected Tab Order:**
1. Location input
2. Target Customer textarea
3. Team Size select
4. Save & Continue button
5. (Cycles back or to browser UI)

**Focus Indicators:**
- Blue outline on focused elements
- Clear visual indication

### Scenario 14: Screen Reader (Optional)

**Setup:**
Enable VoiceOver (Mac) or NVDA (Windows)

**Expected Announcements:**
- Field labels read clearly
- Error messages announced when they appear
- Button state (disabled/enabled) announced
- Form structure understandable

## API Testing with cURL

### Test Session GET (Load)

```bash
# Get session (should return existing clarification data)
curl -i -X GET http://localhost:5000/api/session \
  -H "Cookie: validator_session_id=YOUR_SESSION_ID"
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": "...",
  "session": {
    "inputs": {
      "clarification": {
        "location": "...",
        "targetCustomer": "...",
        "teamSize": "..."
      }
    }
  }
}
```

### Test Session PUT (Save)

```bash
# Save clarification data
curl -i -X PUT http://localhost:5000/api/session \
  -H "Content-Type: application/json" \
  -H "Cookie: validator_session_id=YOUR_SESSION_ID" \
  -d '{
    "inputs": {
      "clarification": {
        "location": "USA & Canada",
        "targetCustomer": "HR managers at mid-sized tech companies",
        "teamSize": "4-10"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": "...",
  "session": {
    "inputs": {
      "clarification": { /* saved data */ }
    },
    "updatedAt": "..."
  }
}
```

## Browser DevTools Checks

### Network Tab

**On Page Load:**
1. Check for: `GET /api/session`
2. Status: 200 (or 404 if no session)
3. Cookies: `validator_session_id` sent

**On Form Submit:**
1. Check for: `PUT /api/session`
2. Status: 200
3. Request Payload: Contains clarification object
4. Response: Updated session

### Application Tab (Cookies)

**Check Cookie:**
- Name: `validator_session_id`
- Value: Long hexadecimal string
- HttpOnly: ✓
- Secure: ✓ (in production)
- SameSite: Lax

### Console Tab

**Expected Messages:**
- On successful save: "Clarification data saved: {object}"
- On error: "Error saving clarification: {error}"
- No React warnings or errors

## Responsive Testing

### Desktop (>768px)

**Expected:**
- Card centered, max-width 800px
- Generous padding (3rem 2.5rem)
- Button aligned right
- Fields have comfortable width

### Tablet (481-768px)

**Expected:**
- Card width adjusts to screen
- Padding reduced (2rem 1.5rem)
- Button becomes full-width
- Font sizes slightly smaller

### Mobile (<480px)

**Expected:**
- Card fills width with small margin
- Compact padding (1.5rem 1rem)
- Button full-width
- Readable text (not too small)
- No horizontal scrolling

**Test Devices:**
- iPhone SE (375px)
- iPhone 12 (390px)
- iPad (768px)
- Desktop (1200px+)

## Edge Cases

### Empty Strings vs Whitespace

**Test:**
1. Type spaces in Location: "   "
2. Blur

**Expected:**
- Treated as empty (trimmed)
- Shows "Please describe where..." error

### Very Long Input

**Test:**
1. Paste 5000 character text in Target Customer

**Expected:**
- Textarea expands (vertical resize)
- No character limit enforced
- Saves successfully (no crash)

### Special Characters

**Test:**
1. Location: "São Paulo, Brazil & México City"
2. Target Customer: "CTOs @ companies w/ <$10M ARR"

**Expected:**
- Accepts all Unicode characters
- Saves and loads correctly
- No encoding issues

### Rapid Clicking

**Test:**
1. Fill form validly
2. Click "Save & Continue" 10 times rapidly

**Expected:**
- Only one API call made
- Button disabled after first click
- No duplicate saves

## Success Criteria

✅ **All scenarios pass**
✅ **No console errors** (except expected network failures)
✅ **Session persists** across refreshes
✅ **Validation works** on change, blur, submit
✅ **Loading states** show appropriately
✅ **Error handling** graceful and informative
✅ **Responsive** on mobile, tablet, desktop
✅ **Accessible** via keyboard and screen reader
✅ **API calls** formatted correctly

## Common Issues & Fixes

### Issue: "Failed to load session: 404"

**Cause:** No active session exists

**Fix:** This is normal on first visit. Form should show empty fields.

### Issue: CORS error in console

**Cause:** Backend CORS not configured for frontend port

**Fix:** Check [backend/src/index.js:21](../../backend/src/index.js) has CORS enabled

### Issue: Cookie not sent with request

**Cause:** Missing `credentials: 'include'`

**Fix:** Already implemented in component, check browser blocks third-party cookies

### Issue: Form values don't persist

**Cause:** Session not saving or different session ID each time

**Fix:**
1. Check cookie is set in DevTools → Application → Cookies
2. Check backend session store is running
3. Verify PUT request returns 200

### Issue: Validation errors don't clear

**Cause:** Error state not properly updating on change

**Fix:** Verify `touched` state is set on blur, errors clear on valid input

## Next Steps After Testing

1. ✅ Verify all scenarios pass
2. ✅ Fix any issues found
3. ✅ Test with Page 1 (ensure session works across pages)
4. ✅ Implement routing (React Router)
5. ✅ Add progress indicator
6. ✅ Build Page 3

---

**Last Updated**: 2025-12-24
**Component**: ClarificationFormPage
**Status**: Ready for Testing
