import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { initSessionStore } from './sessionStore.js'
import sessionMiddleware, { sessionRoutes, requireSession } from './sessionMiddleware.js'
import { initializeAnalysis, getAnalysisStatus } from './routes/analysis.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Initialize session store
initSessionStore({
  maxEntries: parseInt(process.env.SESSION_MAX_ENTRIES) || 10000,
  defaultTTLMs: parseInt(process.env.SESSION_TTL_MS) || 24 * 60 * 60 * 1000, // 24 hours
  evictionPolicy: process.env.SESSION_EVICTION_POLICY || 'lru'
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(cookieParser())

// Session middleware (auto-create enabled for easy testing)
app.use(sessionMiddleware({ autoCreate: true, touchOnAccess: true }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Backend API is running!',
    timestamp: new Date().toISOString(),
    session: req.session ? {
      id: req.session.id,
      createdAt: req.session.createdAt
    } : null
  })
})

// Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the Validator API',
    session: req.sessionId ? `Session: ${req.sessionId}` : 'No session'
  })
})

// Session management routes
app.post('/api/session', sessionRoutes.create)
app.get('/api/session', sessionRoutes.get)
app.put('/api/session', sessionRoutes.update)
app.delete('/api/session', sessionRoutes.destroy)
app.get('/api/session/stats', sessionRoutes.stats)

// Analysis routes
app.post('/api/analysis/init', initializeAnalysis)
app.get('/api/analysis/status', getAnalysisStatus)

// Example: Protected route requiring session
app.get('/api/protected', requireSession(), (req, res) => {
  res.json({
    message: 'This is a protected resource',
    user: req.session.user,
    sessionId: req.sessionId
  })
})

// Example: Store user input in session
app.post('/api/validate', async (req, res) => {
  if (!req.session) {
    return res.status(401).json({ error: 'Session required' })
  }

  // Store user input in session
  req.session.inputs = {
    ...req.session.inputs,
    validationRequest: req.body,
    timestamp: new Date().toISOString()
  }

  await req.session.save()

  res.json({
    success: true,
    message: 'Input stored in session',
    sessionId: req.sessionId
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
