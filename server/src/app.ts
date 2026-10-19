import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { RequestHandler } from 'express'
import type { SessionOptions } from 'express-session'
import helmet from 'helmet'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { errorHandler, HttpError } from './middleware/errorHandler.js'
import { announcementRouter } from './routes/announcement.routes.js'
import { assistantRouter } from './routes/assistant.routes.js'
import { assignmentRouter } from './routes/assignment.routes.js'
import { authRouter } from './routes/auth.routes.js'
import { courseRouter } from './routes/course.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { materialRouter } from './routes/material.routes.js'
import { noteRouter } from './routes/note.routes.js'
import { quizRouter } from './routes/quiz.routes.js'
import { statsRouter } from './routes/stats.routes.js'
import { teacherAiRouter } from './routes/teacherAi.routes.js'

const require = createRequire(import.meta.url)
const session = require('express-session') as (options?: SessionOptions) => RequestHandler
const PgSessionStore = connectPgSimple(session)
const allowedOrigins = new Set(env.clientOrigins)

function isAllowedOrigin(origin?: string, reqHost?: string): boolean {
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true
  try {
    const url = new URL(origin)
    if (
      (reqHost && (url.host === reqHost || url.hostname === reqHost)) ||
      url.hostname.endsWith('.onrender.com') ||
      url.hostname.endsWith('.web.app') ||
      url.hostname.endsWith('.firebaseapp.com') ||
      url.hostname.endsWith('.vercel.app') ||
      url.hostname.endsWith('.trycloudflare.com') ||
      url.hostname.endsWith('.loca.lt') ||
      url.hostname.endsWith('.ngrok-free.app') ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1'
    ) {
      return true
    }
  } catch {}
  return false
}

export const app = express()

app.set('trust proxy', 1)

app.use(helmet({
  contentSecurityPolicy: false,
}))

const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
}

app.use((request, response, next) => {
  const host = request.get('x-forwarded-host') || request.get('host')
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin, host)) {
        callback(null, true)
        return
      }
      callback(new HttpError(403, 'Origin is not allowed'))
    },
    credentials: true,
  })(request, response, next)
})

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))
app.use(session({
  name: 'learnwell.sid',
  store: new PgSessionStore({ pool, createTableIfMissing: true }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}))

// Mount API routes
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/courses', courseRouter)
app.use('/api/materials', materialRouter)
app.use('/api/assignments', assignmentRouter)
app.use('/api/quizzes', quizRouter)
app.use('/api/announcements', announcementRouter)
app.use('/api/notes', noteRouter)
app.use('/api/teacher/ai', teacherAiRouter)
app.use('/api/stats', statsRouter)
app.use('/api/assistant', assistantRouter)

app.use('/api', (_request, _response, next) => next(new HttpError(404, 'API route not found')))

if (fs.existsSync(distPath)) {
  app.use((_request, response) => {
    response.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use(errorHandler)
