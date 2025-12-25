# Session Store Module

A lightweight, pluggable in-memory session storage module with TTL support, eviction policies, and a Redis-compatible API for easy migration.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Session Schema](#session-schema)
- [Configuration](#configuration)
- [Middleware Usage](#middleware-usage)
- [Cookie Security](#cookie-security)
- [Testing](#testing)
- [Migrating to Redis](#migrating-to-redis)
- [Performance Considerations](#performance-considerations)

## Overview

The Session Store module provides an in-memory session management solution for Node.js applications. It's designed to be simple, fast, and easy to swap out for Redis or other external stores when needed.

**Key Use Cases:**
- Development and testing environments
- Single-instance deployments
- Applications with low session volume
- Rapid prototyping before moving to Redis

## Features

- ✅ **Promise-based API** - Async/await support throughout
- ✅ **TTL Support** - Automatic session expiration with configurable defaults
- ✅ **Eviction Policies** - LRU and TTL-based eviction when max entries reached
- ✅ **Size Limits** - Prevent memory bloat with session size validation
- ✅ **Metrics** - Built-in hit/miss tracking and statistics
- ✅ **Express Middleware** - Drop-in middleware with cookie management
- ✅ **Redis-Compatible API** - Easy migration path to Redis
- ✅ **Comprehensive Tests** - Full test coverage with Node's built-in test runner

## Installation

The session store is included in the backend package. No additional installation required.

```bash
npm install  # From monorepo root
```

Dependencies:
- `express` - Web framework
- `cookie-parser` - Cookie parsing middleware

## Quick Start

### Basic Usage

```javascript
import { initSessionStore, getSessionStore, createSession } from './sessionStore.js'

// Initialize the store
const store = initSessionStore({
  maxEntries: 10000,
  defaultTTLMs: 24 * 60 * 60 * 1000, // 24 hours
  evictionPolicy: 'lru'
})

// Create a session
const session = createSession({
  user: { id: '123', email: 'user@example.com' },
  inputs: { query: 'test' }
})

// Store the session
const sessionId = await store.set(null, session)

// Retrieve the session
const retrieved = await store.get(sessionId)

// Update the session
retrieved.inputs.newField = 'value'
await store.set(sessionId, retrieved)

// Delete the session
await store.del(sessionId)
```

### Express Integration

```javascript
import express from 'express'
import cookieParser from 'cookie-parser'
import { initSessionStore } from './sessionStore.js'
import sessionMiddleware, { sessionRoutes } from './sessionMiddleware.js'

const app = express()

// Initialize store
initSessionStore({
  maxEntries: 5000,
  defaultTTLMs: 30 * 60 * 1000 // 30 minutes
})

// Required middleware
app.use(cookieParser())
app.use(express.json())

// Session middleware (auto-create enabled)
app.use(sessionMiddleware({ autoCreate: true, touchOnAccess: true }))

// Session management routes
app.post('/api/session', sessionRoutes.create)
app.get('/api/session', sessionRoutes.get)
app.put('/api/session', sessionRoutes.update)
app.delete('/api/session', sessionRoutes.destroy)
app.get('/api/session/stats', sessionRoutes.stats)

// Protected route example
app.get('/api/protected', (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  res.json({ message: 'Protected data', user: req.session.user })
})
```

## API Reference

### SessionStore Class

#### `async get(id)`
Retrieve a session by ID.

**Parameters:**
- `id` (string) - Session ID

**Returns:** `Promise<object|null>` - Session object or null if not found/expired

**Example:**
```javascript
const session = await store.get('abc123')
```

#### `async set(id, session, ttlMs)`
Create or update a session.

**Parameters:**
- `id` (string|null) - Session ID (null to auto-generate)
- `session` (object) - Session data
- `ttlMs` (number) - Optional TTL in milliseconds

**Returns:** `Promise<string>` - Session ID

**Example:**
```javascript
const id = await store.set(null, sessionData, 3600000) // 1 hour TTL
```

#### `async del(id)`
Delete a session.

**Parameters:**
- `id` (string) - Session ID

**Returns:** `Promise<boolean>` - True if deleted, false if not found

#### `async clear()`
Delete all sessions.

**Returns:** `Promise<void>`

#### `async stats()`
Get store statistics.

**Returns:** `Promise<object>` - Statistics object
```javascript
{
  entryCount: 150,
  maxEntries: 10000,
  hits: 1000,
  misses: 50,
  sets: 200,
  deletes: 50,
  evictions: 5,
  hitRate: 0.95
}
```

#### `async touch(id, ttlMs)`
Extend a session's TTL.

**Parameters:**
- `id` (string) - Session ID
- `ttlMs` (number) - Optional new TTL (uses default if not provided)

**Returns:** `Promise<boolean>` - True if touched, false if not found

#### `async exists(id)`
Check if a session exists and is not expired.

**Parameters:**
- `id` (string) - Session ID

**Returns:** `Promise<boolean>`

### Helper Functions

#### `initSessionStore(options)`
Initialize or reinitialize the singleton store.

**Parameters:**
- `options` (object) - Configuration options

**Returns:** `SessionStore` instance

#### `getSessionStore()`
Get the current store instance (creates default if none exists).

**Returns:** `SessionStore` instance

#### `createSession(data)`
Create a session object with the standard schema.

**Parameters:**
- `data` (object) - Initial session data

**Returns:** Session object with full schema

## Session Schema

Every session follows this structure:

```javascript
{
  // System fields (auto-managed)
  id: string,              // Session ID (set by store)
  createdAt: string,       // ISO timestamp
  updatedAt: string,       // ISO timestamp
  expiresAt: string,       // ISO timestamp
  version: number,         // Schema version (currently 1)

  // User data
  user: {
    id: string,            // User ID
    email: string,         // User email
    roles: string[]        // User roles
  } | null,

  // Application data
  inputs: object,          // Raw user inputs (sanitized)
  apiConfig: object,       // API provider, model, parameters
  results: object,         // API results, status
  meta: object            // Additional metadata (source, IP, etc.)
}
```

**Field Guidelines:**
- **inputs**: Store user form data, search queries, etc. (sanitized)
- **apiConfig**: API provider selection, model names, parameters
- **results**: Trimmed API responses, status codes, error messages
- **meta**: Client IP, user agent, request source, feature flags

**Size Limits:**
- Maximum session size: 1MB (configurable in code)
- Large blobs (files, images) should be stored externally and referenced by ID/URL

## Configuration

### Store Options

```javascript
initSessionStore({
  maxEntries: 10000,           // Maximum sessions to store
  defaultTTLMs: 86400000,      // Default TTL (24 hours)
  evictionPolicy: 'lru'        // 'lru' or 'ttl'
})
```

**maxEntries**
- Maximum number of sessions before eviction starts
- Default: 10,000
- Consider available memory (rough estimate: 1KB per session)

**defaultTTLMs**
- Default time-to-live for sessions in milliseconds
- Default: 24 hours (86,400,000 ms)
- Can be overridden per-session with `set(id, data, ttl)`
 - Configurable via `SESSION_TTL_MS` environment variable

**evictionPolicy**
- `'lru'` - Evict least recently used session (recommended)
- `'ttl'` - Evict session with soonest expiration

### Middleware Options

```javascript
app.use(sessionMiddleware({
  autoCreate: true,      // Auto-create session if none exists
  touchOnAccess: true    // Refresh TTL on each access
}))

### Temporary File Management

Analysis artifacts (per-method `.txt` files and final PDF reports) are written to a temporary directory:

- Base directory is resolved from `ANALYSIS_TMP_DIR` or defaults to `os.tmpdir() + '/validator-analysis'`.
- Each session stores file metadata under:
  - `results.analysis.files[]` – Method files
  - `results.report` – Summary PDF

The backend runs a periodic cleanup task that:

- Scans the analysis temp directory.
- Keeps files that are still referenced by active sessions.
- Deletes files that are not referenced or older than `FILE_TTL_MS` (default: 48 hours).

Cleanup configuration:

- `FILE_TTL_MS` – Max age for files before deletion (ms).
- `FILE_CLEANUP_INTERVAL_MS` – How often cleanup runs (ms, default: 30 minutes).
```

## Middleware Usage

### Auto-Create Sessions

```javascript
// Auto-create for all requests
app.use(sessionMiddleware({ autoCreate: true }))

app.get('/api/data', (req, res) => {
  // req.session always exists
  req.session.lastVisit = new Date()
  await req.session.save()
})
```

### Manual Session Creation

```javascript
// No auto-create
app.use(sessionMiddleware({ autoCreate: false }))

app.post('/api/login', async (req, res) => {
  const store = getSessionStore()
  const session = createSession({
    user: { id: user.id, email: user.email }
  })
  const sessionId = await store.set(null, session)
  createSessionCookie(res, sessionId)
  res.json({ success: true })
})
```

### Protected Routes

```javascript
import { requireSession } from './sessionMiddleware.js'

app.get('/api/protected', requireSession(), (req, res) => {
  // req.session guaranteed to exist
  res.json({ user: req.session.user })
})
```

### Session Helpers

Every request with a valid session gets these helpers:

```javascript
// Save session changes
await req.session.save()

// Destroy session and clear cookie
await req.session.destroy()
```

## Cookie Security

### Cookie Configuration

Default cookie settings:
```javascript
{
  httpOnly: true,                           // Prevent XSS access
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'lax',                         // CSRF protection
  maxAge: 24 * 60 * 60 * 1000,            // 24 hours
  path: '/'                                 // Available site-wide
}
```

### Cookie Name

Default: `validator_session_id`

### Custom Cookie Options

```javascript
import { createSessionCookie } from './sessionMiddleware.js'

createSessionCookie(res, sessionId, {
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  domain: '.example.com',            // Subdomain sharing
  sameSite: 'strict'                 // Stricter CSRF protection
})
```

### Security Best Practices

1. **Store only session ID in cookies** - Never store sensitive data
2. **Use HTTPS in production** - Set `secure: true`
3. **Set appropriate SameSite** - `strict` for sensitive apps, `lax` for general use
4. **Align cookie maxAge with session TTL** - Prevent orphaned cookies
5. **Regenerate session ID on privilege escalation** - After login, prevent fixation attacks

```javascript
// After login, create new session
const oldId = req.sessionId
const newSession = createSession({ user: authenticatedUser })
const newId = await store.set(null, newSession)

// Delete old session
await store.del(oldId)

// Set new cookie
createSessionCookie(res, newId)
```

## Testing

Run the test suite:

```bash
# From backend directory
npm test

# From monorepo root
npm test --workspace=packages/backend
```

### Test Coverage

The test suite covers:
- ✅ Basic CRUD operations (get, set, del, clear)
- ✅ TTL and expiration logic
- ✅ LRU and TTL eviction policies
- ✅ Metrics tracking
- ✅ Session schema validation
- ✅ Size limits
- ✅ Edge cases and error conditions

### Example Test

```javascript
import { test } from 'node:test'
import assert from 'node:assert'
import SessionStore, { createSession } from '../src/sessionStore.js'

test('should expire session after TTL', async () => {
  const store = new SessionStore({ defaultTTLMs: 100 })
  const id = await store.set(null, createSession(), 100)

  // Exists immediately
  assert.ok(await store.get(id))

  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 150))

  // Should be null
  assert.strictEqual(await store.get(id), null)

  store.destroy()
})
```

## Migrating to Redis

The session store API is designed to be Redis-compatible, making migration straightforward.

### Why Migrate to Redis?

Move to Redis when:
- Deploying multiple app instances (horizontal scaling)
- Need session persistence across restarts
- Session volume exceeds memory limits
- Require shared sessions across services

### Migration Steps

1. **Install Redis client:**
```bash
npm install redis --workspace=packages/backend
```

2. **Create Redis adapter:**
```javascript
// src/redisSessionStore.js
import { createClient } from 'redis'

export class RedisSessionStore {
  constructor(options = {}) {
    this.client = createClient({
      url: options.redisUrl || 'redis://localhost:6379'
    })
    this.defaultTTLMs = options.defaultTTLMs || 86400000
    this.client.connect()
  }

  async get(id) {
    const data = await this.client.get(`session:${id}`)
    return data ? JSON.parse(data) : null
  }

  async set(id, session, ttlMs) {
    if (!id) {
      id = crypto.randomBytes(32).toString('hex')
    }
    const ttl = ttlMs || this.defaultTTLMs
    await this.client.setEx(
      `session:${id}`,
      Math.floor(ttl / 1000),
      JSON.stringify(session)
    )
    return id
  }

  async del(id) {
    const result = await this.client.del(`session:${id}`)
    return result > 0
  }

  async clear() {
    const keys = await this.client.keys('session:*')
    if (keys.length > 0) {
      await this.client.del(keys)
    }
  }

  async stats() {
    const keys = await this.client.keys('session:*')
    return { entryCount: keys.length }
  }

  async exists(id) {
    const result = await this.client.exists(`session:${id}`)
    return result > 0
  }

  async touch(id, ttlMs) {
    const ttl = ttlMs || this.defaultTTLMs
    const result = await this.client.expire(
      `session:${id}`,
      Math.floor(ttl / 1000)
    )
    return result > 0
  }
}
```

3. **Update initialization:**
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

4. **No middleware changes required** - The middleware uses the same API

### Redis Deployment Tips

- Use Redis in production for persistence and scalability
- Enable Redis persistence (RDB or AOF) to survive restarts
- Set up Redis replication for high availability
- Use Redis Cluster for very high session volumes
- Monitor Redis memory usage and eviction policies

## Performance Considerations

### Memory Usage

**Rough estimates:**
- Empty session: ~500 bytes
- Typical session: 1-3 KB
- 10,000 sessions: ~10-30 MB

**Monitor memory:**
```javascript
const stats = await store.stats()
console.log(`Sessions: ${stats.entryCount}/${stats.maxEntries}`)
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
```

### Concurrency

**Node.js single-threaded:**
- No race conditions within a single process
- In-memory store is safe for single instance

**Multi-instance deployments:**
- Must use external store (Redis)
- In-memory store will have separate sessions per instance

### TTL Cleanup

- Expired sessions cleaned up every 60 seconds
- On-demand cleanup during `get()` operations
- Eviction triggers when `maxEntries` reached

### Optimization Tips

1. **Set appropriate TTLs** - Shorter TTLs reduce memory usage
2. **Monitor hit rates** - Low hit rate may indicate TTL too short
3. **Limit session size** - Store large blobs externally
4. **Use compression for large sessions** - Consider gzip for >10KB sessions
5. **Profile in production** - Use `stats()` to monitor performance

---

## Support

For issues, questions, or contributions, please refer to the main project repository.

## License

ISC
