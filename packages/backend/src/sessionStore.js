/**
 * In-memory session store with TTL support and eviction policies.
 * This module provides a Redis-compatible API for easy migration.
 */

import crypto from 'crypto'

class SessionStore {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 10000
    this.defaultTTLMs = options.defaultTTLMs || 24 * 60 * 60 * 1000 // 24 hours
    this.evictionPolicy = options.evictionPolicy || 'lru' // 'lru' or 'ttl'

    // Core storage
    this.sessions = new Map()

    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    }

    // TTL cleanup interval
    this.cleanupInterval = setInterval(() => this._cleanupExpired(), 60000) // Every minute
  }

  /**
   * Generate a secure session ID
   */
  generateId() {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Get a session by ID
   * @param {string} id - Session ID
   * @returns {Promise<object|null>} Session object or null if not found/expired
   */
  async get(id) {
    const entry = this.sessions.get(id)

    if (!entry) {
      this.metrics.misses++
      return null
    }

    // Check if expired
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      await this.del(id)
      this.metrics.misses++
      return null
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now()
    this.metrics.hits++

    return entry.session
  }

  /**
   * Set/create a session
   * @param {string} id - Session ID (optional, will generate if not provided)
   * @param {object} session - Session data
   * @param {number} ttlMs - Time to live in milliseconds (optional)
   * @returns {Promise<string>} Session ID
   */
  async set(id, session, ttlMs) {
    if (!id) {
      id = this.generateId()
    }

    const ttl = ttlMs || this.defaultTTLMs
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttl)

    // Validate session size
    const sessionSize = JSON.stringify(session).length
    if (sessionSize > 1024 * 1024) { // 1MB limit
      throw new Error('Session size exceeds 1MB limit')
    }

    // Check if we need to evict
    if (!this.sessions.has(id) && this.sessions.size >= this.maxEntries) {
      await this._evict()
    }

    // Create session entry
    const entry = {
      session: {
        ...session,
        id,
        createdAt: session.createdAt || now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      },
      expiresAt: expiresAt.toISOString(),
      lastAccessed: Date.now()
    }

    this.sessions.set(id, entry)
    this.metrics.sets++

    return id
  }

  /**
   * Delete a session
   * @param {string} id - Session ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async del(id) {
    const deleted = this.sessions.delete(id)
    if (deleted) {
      this.metrics.deletes++
    }
    return deleted
  }

  /**
   * Clear all sessions
   * @returns {Promise<void>}
   */
  async clear() {
    this.sessions.clear()
  }

  /**
   * Get store statistics
   * @returns {Promise<object>} Statistics object
   */
  async stats() {
    return {
      entryCount: this.sessions.size,
      maxEntries: this.maxEntries,
      ...this.metrics,
      hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0
    }
  }

  /**
   * Touch a session to extend its TTL
   * @param {string} id - Session ID
   * @param {number} ttlMs - New TTL in milliseconds
   * @returns {Promise<boolean>} True if touched, false if not found
   */
  async touch(id, ttlMs) {
    const entry = this.sessions.get(id)
    if (!entry) {
      return false
    }

    const ttl = ttlMs || this.defaultTTLMs
    const expiresAt = new Date(Date.now() + ttl)

    entry.expiresAt = expiresAt.toISOString()
    entry.session.expiresAt = expiresAt.toISOString()
    entry.session.updatedAt = new Date().toISOString()
    entry.lastAccessed = Date.now()

    return true
  }

  /**
   * Check if a session exists
   * @param {string} id - Session ID
   * @returns {Promise<boolean>} True if exists and not expired
   */
  async exists(id) {
    const session = await this.get(id)
    return session !== null
  }

  /**
   * Clean up expired sessions
   * @private
   */
  _cleanupExpired() {
    const now = new Date()
    let cleaned = 0

    for (const [id, entry] of this.sessions.entries()) {
      if (entry.expiresAt && new Date(entry.expiresAt) < now) {
        this.sessions.delete(id)
        cleaned++
      }
    }

    if (cleaned > 0) {
      this.metrics.evictions += cleaned
    }
  }

  /**
   * Evict sessions based on policy
   * @private
   */
  async _evict() {
    if (this.sessions.size === 0) return

    let victimId = null

    if (this.evictionPolicy === 'lru') {
      // Find least recently used
      let oldestAccess = Infinity

      for (const [id, entry] of this.sessions.entries()) {
        if (entry.lastAccessed < oldestAccess) {
          oldestAccess = entry.lastAccessed
          victimId = id
        }
      }
    } else if (this.evictionPolicy === 'ttl') {
      // Find soonest to expire
      let soonestExpiry = new Date(8640000000000000) // Max date

      for (const [id, entry] of this.sessions.entries()) {
        const expiry = new Date(entry.expiresAt)
        if (expiry < soonestExpiry) {
          soonestExpiry = expiry
          victimId = id
        }
      }
    }

    if (victimId) {
      this.sessions.delete(victimId)
      this.metrics.evictions++
    }
  }

  /**
   * Destroy the store and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.sessions.clear()
  }
}

// Singleton instance
let storeInstance = null

/**
 * Initialize the session store
 * @param {object} options - Configuration options
 * @returns {SessionStore} Store instance
 */
export function initSessionStore(options = {}) {
  if (storeInstance) {
    storeInstance.destroy()
  }

  storeInstance = new SessionStore(options)
  return storeInstance
}

/**
 * Get the current store instance
 * @returns {SessionStore} Store instance
 */
export function getSessionStore() {
  if (!storeInstance) {
    storeInstance = new SessionStore()
  }
  return storeInstance
}

/**
 * Create a new session with the standard schema
 * @param {object} data - Session data
 * @returns {object} Session object with schema
 */
export function createSession(data = {}) {
  const now = new Date().toISOString()

  return {
    id: null, // Will be set by store
    createdAt: now,
    updatedAt: now,
    expiresAt: null, // Will be set by store
    version: 1,
    user: data.user || null,
    inputs: data.inputs || {},
    apiConfig: data.apiConfig || {},
    results: data.results || {},
    meta: data.meta || {}
  }
}

export default SessionStore
