# Backend API Server

Express-based API server with session management, CORS support, and cookie-based authentication.

## Features

- ✅ **Express Server** - REST API with JSON support
- ✅ **Session Management** - In-memory session store with TTL and eviction
- ✅ **Cookie Security** - HTTP-only, secure cookies with SameSite protection
- ✅ **CORS Enabled** - Cross-origin resource sharing configured
- ✅ **Environment Configuration** - dotenv for configuration management
- ✅ **Comprehensive Tests** - Full test coverage with Node's test runner

## Quick Start

### Installation

```bash
# From monorepo root
npm install

# Or from backend directory
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run tests
npm test
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
PORT=5000
NODE_ENV=development

# Session Store Configuration
SESSION_MAX_ENTRIES=10000
SESSION_TTL_MS=86400000
SESSION_EVICTION_POLICY=lru
```

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Main server file
│   ├── sessionStore.js       # Session storage engine
│   └── sessionMiddleware.js  # Express session middleware
├── test/
│   └── sessionStore.test.js  # Unit tests
├── .env.example              # Environment template
├── package.json              # Dependencies and scripts
├── SESSION_STORE.md          # Detailed session store documentation
└── test-session-api.sh       # Integration test script
```

## API Endpoints

### Health & Status

**GET /api/health**
- Check server health and session status
- Returns: Server status, timestamp, session info

**GET /api**
- Welcome endpoint
- Returns: Welcome message and session ID

### Session Management

**POST /api/session**
- Create a new session
- Body: `{ user, meta }`
- Returns: Session ID and session data

**GET /api/session**
- Get current session
- Returns: Session data

**PUT /api/session**
- Update current session
- Body: Session fields to update
- Returns: Updated session data

**DELETE /api/session**
- Destroy current session
- Returns: Success message

**GET /api/session/stats**
- Get session store statistics
- Returns: Metrics (hits, misses, entry count, etc.)

### Application Endpoints

**GET /api/protected**
- Example protected route (requires session)
- Returns: Protected data

**POST /api/validate**
- Store validation input in session
- Body: Validation request data
- Returns: Success confirmation

## Session Store

The backend includes a robust in-memory session store with the following features:

### Features

- **TTL Support** - Automatic expiration with configurable defaults
- **Eviction Policies** - LRU and TTL-based eviction
- **Size Limits** - 1MB session size limit
- **Metrics** - Hit/miss tracking and statistics
- **Auto-Cleanup** - Expired sessions cleaned every 60 seconds

### Session Schema

```javascript
{
  id: string,              // Auto-generated
  createdAt: string,       // ISO timestamp
  updatedAt: string,       // ISO timestamp
  expiresAt: string,       // ISO timestamp
  version: number,         // Schema version
  user: object | null,     // User data
  inputs: object,          // User inputs
  apiConfig: object,       // API configuration
  results: object,         // API results
  meta: object            // Metadata
}
```

### Usage Example

```javascript
// Access session in routes
app.get('/api/example', async (req, res) => {
  // Session auto-created and available
  console.log('Session ID:', req.sessionId)
  console.log('User:', req.session.user)

  // Update session
  req.session.inputs = { newData: 'value' }
  await req.session.save()

  // Destroy session
  await req.session.destroy()
})
```

### Detailed Documentation

See [SESSION_STORE.md](./SESSION_STORE.md) for complete documentation including:
- Full API reference
- Configuration options
- Security best practices
- Migrating to Redis
- Performance considerations

## Testing

### Unit Tests

```bash
npm test
```

Test coverage includes:
- Basic CRUD operations
- TTL and expiration
- Eviction policies (LRU, TTL)
- Metrics tracking
- Session schema validation
- Edge cases

All 20 tests passing ✅

### Integration Tests

Run the integration test script (requires server running):

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run integration tests
./test-session-api.sh
```

## Cookie Security

### Default Settings

- **httpOnly**: `true` - Prevents XSS access
- **secure**: `true` in production - HTTPS only
- **sameSite**: `lax` - CSRF protection
- **maxAge**: 24 hours - Aligned with session TTL

### Cookie Name

`validator_session_id`

### Production Recommendations

1. Always use HTTPS (`secure: true`)
2. Consider `sameSite: 'strict'` for sensitive apps
3. Regenerate session ID after login
4. Implement session rotation for long-lived sessions

## Migrating to Redis

The session store uses a Redis-compatible API for easy migration:

```javascript
// Development: In-memory
import { initSessionStore } from './sessionStore.js'
const store = initSessionStore()

// Production: Redis
import { RedisSessionStore } from './redisSessionStore.js'
const store = new RedisSessionStore({
  redisUrl: process.env.REDIS_URL
})
```

See [SESSION_STORE.md](./SESSION_STORE.md#migrating-to-redis) for complete migration guide.

## Performance

### Memory Usage

- Rough estimate: 1-3 KB per session
- 10,000 sessions: ~10-30 MB
- Monitor with `/api/session/stats`

### Scalability

**Single Instance:**
- In-memory store suitable for development and small deployments
- No external dependencies

**Multi-Instance:**
- Use Redis for shared sessions across instances
- Enables horizontal scaling

## Development

### Adding New Routes

```javascript
// src/index.js

app.get('/api/new-route', (req, res) => {
  // Access session
  if (!req.session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Your logic here
  res.json({ data: 'response' })
})
```

### Protected Routes

```javascript
import { requireSession } from './sessionMiddleware.js'

app.get('/api/protected', requireSession(), (req, res) => {
  // Session guaranteed to exist
  res.json({ user: req.session.user })
})
```

## Dependencies

### Production

- `express` - Web framework
- `cors` - CORS middleware
- `dotenv` - Environment configuration
- `cookie-parser` - Cookie parsing

### Development

- `nodemon` - Hot reload for development

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run test suite

## License

ISC
