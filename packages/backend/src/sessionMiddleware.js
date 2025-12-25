/**
 * Session middleware and cookie utilities for Express
 */

import { getSessionStore, createSession } from './sessionStore.js'

const SESSION_COOKIE_NAME = 'validator_session_id'

/**
 * Cookie configuration
 */
const DEFAULT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
}

/**
 * Create a session cookie
 * @param {Response} res - Express response object
 * @param {string} id - Session ID
 * @param {object} opts - Cookie options (optional)
 */
export function createSessionCookie(res, id, opts = {}) {
  const options = { ...DEFAULT_COOKIE_OPTIONS, ...opts }
  res.cookie(SESSION_COOKIE_NAME, id, options)
}

/**
 * Clear the session cookie
 * @param {Response} res - Express response object
 */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })
}

/**
 * Get session ID from cookie
 * @param {Request} req - Express request object
 * @returns {string|null} Session ID or null
 */
export function getSessionIdFromCookie(req) {
  return req.cookies?.[SESSION_COOKIE_NAME] || null
}

/**
 * Session middleware for Express
 * Loads session from store and attaches to req.session
 * Creates new session if none exists
 *
 * @param {object} options - Middleware options
 * @param {boolean} options.autoCreate - Auto-create session if none exists (default: false)
 * @param {boolean} options.touchOnAccess - Refresh TTL on each access (default: true)
 * @returns {Function} Express middleware
 */
export function sessionMiddleware(options = {}) {
  const {
    autoCreate = false,
    touchOnAccess = true
  } = options

  return async (req, res, next) => {
    const store = getSessionStore()

    // Parse cookies if not already parsed
    if (!req.cookies) {
      console.warn('Session middleware: cookie-parser not detected. Install and use cookie-parser middleware.')
      req.cookies = {}
    }

    // Get session ID from cookie
    let sessionId = getSessionIdFromCookie(req)

    // Try to load existing session
    if (sessionId) {
      const session = await store.get(sessionId)

      if (session) {
        req.sessionId = sessionId
        req.session = session

        // Touch session to extend TTL
        if (touchOnAccess) {
          await store.touch(sessionId)
        }

        // Add save helper
        req.session.save = async () => {
          await store.set(sessionId, req.session)
        }

        // Add destroy helper
        req.session.destroy = async () => {
          await store.del(sessionId)
          clearSessionCookie(res)
          req.sessionId = null
          req.session = null
        }

        return next()
      }
    }

    // Auto-create session if enabled
    if (autoCreate) {
      const newSession = createSession({
        meta: {
          userAgent: req.get('user-agent'),
          ip: req.ip
        }
      })

      sessionId = await store.set(null, newSession)
      req.sessionId = sessionId
      req.session = await store.get(sessionId)

      // Set cookie
      createSessionCookie(res, sessionId)

      // Add helpers
      req.session.save = async () => {
        await store.set(sessionId, req.session)
      }

      req.session.destroy = async () => {
        await store.del(sessionId)
        clearSessionCookie(res)
        req.sessionId = null
        req.session = null
      }
    }

    next()
  }
}

/**
 * Require session middleware
 * Returns 401 if no valid session exists
 */
export function requireSession() {
  return (req, res, next) => {
    if (!req.session || !req.sessionId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid session required'
      })
    }
    next()
  }
}

/**
 * Session route helpers
 */
export const sessionRoutes = {
  /**
   * Create a new session
   */
  create: async (req, res) => {
    const store = getSessionStore()

    const sessionData = createSession({
      user: req.body.user || null,
      meta: {
        userAgent: req.get('user-agent'),
        ip: req.ip,
        source: req.body.source || 'api'
      }
    })

    const sessionId = await store.set(null, sessionData)
    const session = await store.get(sessionId)

    createSessionCookie(res, sessionId)

    res.status(201).json({
      success: true,
      sessionId,
      session
    })
  },

  /**
   * Get current session
   */
  get: async (req, res) => {
    if (!req.session) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active session'
      })
    }

    res.json({
      success: true,
      sessionId: req.sessionId,
      session: req.session
    })
  },

  /**
   * Update current session
   */
  update: async (req, res) => {
    if (!req.session) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active session'
      })
    }

    const store = getSessionStore()
    const updates = req.body

    // Merge updates
    const updatedSession = {
      ...req.session,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await store.set(req.sessionId, updatedSession)
    req.session = await store.get(req.sessionId)

    res.json({
      success: true,
      sessionId: req.sessionId,
      session: req.session
    })
  },

  /**
   * Destroy current session
   */
  destroy: async (req, res) => {
    if (!req.session) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No active session'
      })
    }

    await req.session.destroy()

    res.json({
      success: true,
      message: 'Session destroyed'
    })
  },

  /**
   * Get session store statistics
   */
  stats: async (req, res) => {
    const store = getSessionStore()
    const stats = await store.stats()

    res.json({
      success: true,
      stats
    })
  }
}

export default sessionMiddleware
