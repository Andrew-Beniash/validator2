import { test, describe } from 'node:test'
import assert from 'node:assert'
import { sendAnalysisEmailRoute } from '../src/routes/analysis.js'

describe('analysis routes - sendAnalysisEmailRoute', () => {
  function createRes() {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.body = payload
        return this
      }
    }
    return res
  }

  test('returns 404 when analysis/report missing', async () => {
    const req = { session: {} }
    const res = createRes()

    await sendAnalysisEmailRoute(req, res)

    assert.strictEqual(res.statusCode, 404)
  })

  test('returns 400 when analysis not completed', async () => {
    const req = {
      session: {
        apiConfig: { email: 'user@example.com' },
        results: {
          analysis: { status: 'in-progress' },
          report: { filename: 'x.pdf', filepath: '/tmp/x.pdf' }
        }
      }
    }
    const res = createRes()

    await sendAnalysisEmailRoute(req, res)

    assert.strictEqual(res.statusCode, 400)
  })

  test('returns 400 when email missing', async () => {
    const req = {
      session: {
        results: {
          analysis: { status: 'completed' },
          report: { filename: 'x.pdf', filepath: '/tmp/x.pdf' }
        }
      }
    }
    const res = createRes()

    await sendAnalysisEmailRoute(req, res)

    assert.strictEqual(res.statusCode, 400)
  })
})
