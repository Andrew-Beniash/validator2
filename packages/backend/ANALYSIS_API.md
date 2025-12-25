# Analysis API Documentation

## Overview

The Analysis API provides endpoints for initializing and tracking problem validation analysis sessions. It accepts multi-step form data, performs comprehensive server-side validation, and initializes the analysis workflow with five validation methodologies.

## Endpoints

### POST /api/analysis/init

Initialize a new analysis session with validated form data.

#### Request

**Headers:**
```
Content-Type: application/json
Cookie: sessionId=<session-id>
```

**Body:**
```json
{
  "problem": {
    "description": "string (500-2000 characters, required)"
  },
  "clarification": {
    "location": "string (≥3 characters, required)",
    "targetCustomer": "string (≥20 characters, required)",
    "teamSize": "string (valid range or positive integer, required)"
  },
  "config": {
    "email": "string (valid email format, required)",
    "provider": "openai | claude (required)",
    "model": "string (must be valid for provider, required)",
    "apiKey": "string (≥20 characters, required)"
  }
}
```

**Valid Team Sizes:**
- `"1-3"`
- `"4-10"`
- `"11-50"`
- `"51-200"`
- `"200+"`
- Any positive integer as a string

**Valid Models by Provider:**

*OpenAI:*
- `gpt-4`
- `gpt-4-turbo`
- `gpt-3.5-turbo`

*Claude:*
- `claude-3-opus`
- `claude-3-sonnet`
- `claude-3-haiku`

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "Analysis session initialized successfully",
  "data": {
    "analysisId": "string (session ID)",
    "status": "pending",
    "steps": [
      {
        "name": "JTBD",
        "status": "pending"
      },
      {
        "name": "DesignThinking",
        "status": "pending"
      },
      {
        "name": "LeanCanvas",
        "status": "pending"
      },
      {
        "name": "RootCauseAnalysis",
        "status": "pending"
      },
      {
        "name": "OpportunityTree",
        "status": "pending"
      }
    ]
  }
}
```

#### Validation Error Response

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "problem.description": "Problem description must be at least 500 characters",
    "config.email": "Invalid email address format",
    "config.provider": "Provider must be either \"openai\" or \"claude\""
  }
}
```

#### Server Error Response

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Error details"
}
```

### GET /api/analysis/status

Get the current status of the analysis for the current session.

#### Request

**Headers:**
```
Cookie: sessionId=<session-id>
```

#### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "status": "pending | in-progress | completed | failed",
    "startedAt": "ISO 8601 timestamp or null",
    "completedAt": "ISO 8601 timestamp or null",
    "steps": [
      {
        "name": "JTBD",
        "status": "pending | in-progress | completed | failed",
        "hasResult": false
      }
    ],
    "error": "Error message or null"
  }
}
```

#### Not Found Response

**Status:** `404 Not Found`

```json
{
  "success": false,
  "error": "No analysis found for this session"
}
```

## Validation Rules

### problem.description
- **Type:** String
- **Required:** Yes
- **Min Length:** 500 characters
- **Max Length:** 2000 characters
- **Error Messages:**
  - `"Problem description is required"`
  - `"Problem description must be a string"`
  - `"Problem description must be at least 500 characters"`
  - `"Problem description must not exceed 2000 characters"`

### clarification.location
- **Type:** String
- **Required:** Yes
- **Min Length:** 3 characters (after trim)
- **Error Messages:**
  - `"Location is required"`
  - `"Location must be a string"`
  - `"Location must be at least 3 characters"`

### clarification.targetCustomer
- **Type:** String
- **Required:** Yes
- **Min Length:** 20 characters (after trim)
- **Error Messages:**
  - `"Target customer description is required"`
  - `"Target customer must be a string"`
  - `"Target customer description must be at least 20 characters"`

### clarification.teamSize
- **Type:** String
- **Required:** Yes
- **Valid Values:** `"1-3"`, `"4-10"`, `"11-50"`, `"51-200"`, `"200+"`, or positive integer
- **Error Messages:**
  - `"Team size is required"`
  - `"Team size must be a string"`
  - `"Team size must be one of: 1-3, 4-10, 11-50, 51-200, 200+ or a positive integer"`

### config.email
- **Type:** String
- **Required:** Yes
- **Format:** Valid email (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Error Messages:**
  - `"Email address is required"`
  - `"Email must be a string"`
  - `"Invalid email address format"`

### config.provider
- **Type:** String
- **Required:** Yes
- **Valid Values:** `"openai"`, `"claude"`
- **Error Messages:**
  - `"AI provider is required"`
  - `"Provider must be either \"openai\" or \"claude\""`

### config.model
- **Type:** String
- **Required:** Yes
- **Valid Values:** Depends on provider (see above)
- **Error Messages:**
  - `"Model selection is required"`
  - `"Model must be one of: <list>"`

### config.apiKey
- **Type:** String
- **Required:** Yes
- **Min Length:** 20 characters
- **Error Messages:**
  - `"API key is required"`
  - `"API key must be a string"`
  - `"API key must be at least 20 characters"`

## Security Considerations

### API Key Handling
- **IMPORTANT:** API keys are NOT stored in the session for security reasons
- API keys are validated during initialization but not persisted
- API keys should be passed directly to the analysis service when executing validation
- Consider implementing encrypted temporary storage if keys need to be retained

### Session Management
- All endpoints require a valid session cookie
- Sessions are automatically created via the session middleware
- Session data includes:
  - `inputs.validationRequest`: Problem and clarification data
  - `apiConfig`: Email, provider, and model (NO API key)
  - `results.analysis`: Analysis state and results

### Validation Strategy
- All validation is performed server-side
- Frontend validation is for UX only and should not be trusted
- Detailed validation errors are returned to help users correct issues
- Type checking is enforced for all fields

## Session Data Structure

After successful initialization, the session contains:

```json
{
  "inputs": {
    "validationRequest": {
      "description": "The problem description",
      "location": "Customer location",
      "targetCustomer": "Target customer description",
      "teamSize": "Team size range"
    }
  },
  "apiConfig": {
    "email": "user@example.com",
    "provider": "openai",
    "model": "gpt-4"
  },
  "results": {
    "analysis": {
      "status": "pending",
      "startedAt": null,
      "completedAt": null,
      "steps": [
        {
          "name": "JTBD",
          "status": "pending",
          "result": null
        }
      ],
      "error": null
    }
  }
}
```

## Example Usage

### Initialize Analysis

```bash
curl -X POST http://localhost:5001/api/analysis/init \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -b cookies.txt \
  -d '{
    "problem": {
      "description": "<500-2000 character problem description>"
    },
    "clarification": {
      "location": "San Francisco Bay Area",
      "targetCustomer": "Small to medium-sized tech startups",
      "teamSize": "4-10"
    },
    "config": {
      "email": "user@example.com",
      "provider": "openai",
      "model": "gpt-4",
      "apiKey": "sk-..."
    }
  }'
```

### Check Status

```bash
curl -X GET http://localhost:5001/api/analysis/status \
  -b cookies.txt
```

## Error Handling

### Client-Side Best Practices
1. Always validate form data on the client side for immediate feedback
2. Handle validation errors by mapping `details` object to form fields
3. Display user-friendly error messages
4. Retry failed requests with exponential backoff
5. Clear sensitive data (API keys) from memory after submission

### Server-Side Error Handling
- All errors return structured JSON responses
- Validation errors include field-level details
- Internal errors are logged server-side with stack traces
- Session errors return 500 status with generic message

## Future Enhancements

- [ ] Add rate limiting per session
- [ ] Implement API key encryption in memory
- [ ] Add webhook support for analysis completion
- [ ] Support batch analysis initialization
- [ ] Add analysis result pagination
- [ ] Implement analysis cancellation endpoint
