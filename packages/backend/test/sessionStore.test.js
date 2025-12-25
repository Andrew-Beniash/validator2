/**
 * Unit tests for sessionStore module
 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import SessionStore, { initSessionStore, createSession } from '../src/sessionStore.js'

describe('SessionStore', () => {
  let store

  beforeEach(() => {
    store = new SessionStore({
      maxEntries: 5,
      defaultTTLMs: 1000, // 1 second for testing
      evictionPolicy: 'lru'
    })
  })

  afterEach(() => {
    if (store) {
      store.destroy()
    }
  })

  describe('Basic Operations', () => {
    test('should set and get a session', async () => {
      const session = createSession({ inputs: { test: 'data' } })
      const id = await store.set(null, session)

      assert.ok(id, 'Session ID should be generated')
      assert.strictEqual(typeof id, 'string')

      const retrieved = await store.get(id)
      assert.ok(retrieved, 'Session should be retrieved')
      assert.strictEqual(retrieved.inputs.test, 'data')
    })

    test('should generate unique session IDs', async () => {
      const session1 = createSession()
      const session2 = createSession()

      const id1 = await store.set(null, session1)
      const id2 = await store.set(null, session2)

      assert.notStrictEqual(id1, id2, 'Session IDs should be unique')
    })

    test('should update existing session', async () => {
      const session = createSession({ inputs: { value: 1 } })
      const id = await store.set(null, session)

      const updated = { ...session, inputs: { value: 2 } }
      await store.set(id, updated)

      const retrieved = await store.get(id)
      assert.strictEqual(retrieved.inputs.value, 2)
    })

    test('should delete a session', async () => {
      const session = createSession()
      const id = await store.set(null, session)

      const deleted = await store.del(id)
      assert.strictEqual(deleted, true)

      const retrieved = await store.get(id)
      assert.strictEqual(retrieved, null)
    })

    test('should return false when deleting non-existent session', async () => {
      const deleted = await store.del('non-existent')
      assert.strictEqual(deleted, false)
    })

    test('should clear all sessions', async () => {
      await store.set(null, createSession())
      await store.set(null, createSession())
      await store.set(null, createSession())

      await store.clear()

      const stats = await store.stats()
      assert.strictEqual(stats.entryCount, 0)
    })

    test('should check if session exists', async () => {
      const session = createSession()
      const id = await store.set(null, session)

      const exists = await store.exists(id)
      assert.strictEqual(exists, true)

      const notExists = await store.exists('fake-id')
      assert.strictEqual(notExists, false)
    })
  })

  describe('TTL and Expiration', () => {
    test('should expire session after TTL', async (t) => {
      const session = createSession()
      const id = await store.set(null, session, 100) // 100ms TTL

      // Should exist immediately
      let retrieved = await store.get(id)
      assert.ok(retrieved)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be expired
      retrieved = await store.get(id)
      assert.strictEqual(retrieved, null)
    })

    test('should touch session to extend TTL', async () => {
      const session = createSession()
      const id = await store.set(null, session, 100) // 100ms TTL

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50))

      // Touch to extend
      const touched = await store.touch(id, 200)
      assert.strictEqual(touched, true)

      // Wait past original expiry
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still exist
      const retrieved = await store.get(id)
      assert.ok(retrieved)
    })

    test('should return false when touching non-existent session', async () => {
      const touched = await store.touch('fake-id')
      assert.strictEqual(touched, false)
    })

    test('should cleanup expired sessions automatically', async () => {
      // Create sessions with very short TTL
      await store.set(null, createSession(), 50)
      await store.set(null, createSession(), 50)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))

      // Trigger cleanup
      store._cleanupExpired()

      const stats = await store.stats()
      assert.strictEqual(stats.entryCount, 0)
    })
  })

  describe('Eviction Policies', () => {
    test('should evict LRU session when max entries reached', async () => {
      // Fill store to max
      const ids = []
      for (let i = 0; i < 5; i++) {
        const id = await store.set(null, createSession({ inputs: { index: i } }))
        ids.push(id)
      }

      // Access all but first to make it LRU
      for (let i = 1; i < 5; i++) {
        await store.get(ids[i])
      }

      // Add one more to trigger eviction
      await store.set(null, createSession({ inputs: { index: 5 } }))

      // First session should be evicted
      const firstSession = await store.get(ids[0])
      assert.strictEqual(firstSession, null)

      // Others should still exist
      const secondSession = await store.get(ids[1])
      assert.ok(secondSession)
    })

    test('should evict by TTL when policy is ttl', async () => {
      const ttlStore = new SessionStore({
        maxEntries: 3,
        evictionPolicy: 'ttl'
      })

      try {
        // Create sessions with different TTLs
        const id1 = await ttlStore.set(null, createSession(), 1000) // 1s
        await new Promise(resolve => setTimeout(resolve, 10))
        const id2 = await ttlStore.set(null, createSession(), 2000) // 2s
        await new Promise(resolve => setTimeout(resolve, 10))
        const id3 = await ttlStore.set(null, createSession(), 3000) // 3s

        // Add one more to trigger eviction
        await ttlStore.set(null, createSession(), 4000)

        // Session with shortest TTL should be evicted
        const session1 = await ttlStore.get(id1)
        assert.strictEqual(session1, null)

        // Others should exist
        const session2 = await ttlStore.get(id2)
        assert.ok(session2)
      } finally {
        ttlStore.destroy()
      }
    })
  })

  describe('Metrics', () => {
    test('should track hits and misses', async () => {
      const session = createSession()
      const id = await store.set(null, session)

      // Hit
      await store.get(id)
      // Miss
      await store.get('fake-id')

      const stats = await store.stats()
      assert.strictEqual(stats.hits, 1)
      assert.strictEqual(stats.misses, 1)
      assert.strictEqual(stats.hitRate, 0.5)
    })

    test('should track sets and deletes', async () => {
      const id1 = await store.set(null, createSession())
      const id2 = await store.set(null, createSession())
      await store.del(id1)

      const stats = await store.stats()
      assert.strictEqual(stats.sets, 2)
      assert.strictEqual(stats.deletes, 1)
    })

    test('should track evictions', async () => {
      // Fill to max
      for (let i = 0; i < 5; i++) {
        await store.set(null, createSession())
      }

      // Trigger eviction
      await store.set(null, createSession())

      const stats = await store.stats()
      assert.strictEqual(stats.evictions, 1)
    })

    test('should report entry count', async () => {
      await store.set(null, createSession())
      await store.set(null, createSession())

      const stats = await store.stats()
      assert.strictEqual(stats.entryCount, 2)
      assert.strictEqual(stats.maxEntries, 5)
    })
  })

  describe('Session Schema', () => {
    test('should create session with proper schema', async () => {
      const session = createSession({
        user: { id: '123', email: 'test@example.com' },
        inputs: { query: 'test' },
        apiConfig: { provider: 'openai' },
        results: { output: 'result' },
        meta: { source: 'web' }
      })

      const id = await store.set(null, session)
      const retrieved = await store.get(id)

      assert.ok(retrieved.id)
      assert.ok(retrieved.createdAt)
      assert.ok(retrieved.updatedAt)
      assert.ok(retrieved.expiresAt)
      assert.strictEqual(retrieved.version, 1)
      assert.strictEqual(retrieved.user.email, 'test@example.com')
      assert.strictEqual(retrieved.inputs.query, 'test')
      assert.strictEqual(retrieved.apiConfig.provider, 'openai')
      assert.strictEqual(retrieved.results.output, 'result')
      assert.strictEqual(retrieved.meta.source, 'web')
    })

    test('should reject session larger than 1MB', async () => {
      const largeData = 'x'.repeat(1024 * 1024 + 1)
      const session = createSession({ inputs: { large: largeData } })

      await assert.rejects(
        async () => await store.set(null, session),
        /Session size exceeds 1MB limit/
      )
    })
  })

  describe('Singleton Functions', () => {
    test('should initialize singleton store', () => {
      const store1 = initSessionStore({ maxEntries: 100 })
      assert.ok(store1)
      assert.strictEqual(store1.maxEntries, 100)

      // Re-initialize should destroy old and create new
      const store2 = initSessionStore({ maxEntries: 200 })
      assert.strictEqual(store2.maxEntries, 200)

      store2.destroy()
    })
  })
})
