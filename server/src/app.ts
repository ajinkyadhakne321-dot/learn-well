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
import { authRouter } from './routes/auth.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { assistantRouter } from './routes/assistant.routes.js'

const require = createRequire(import.meta.url)
const session = require('express-session') as (options?: SessionOptions) => RequestHandler
const PgSessionStore = connectPgSimple(session)
const allowedOrigins = new Set(env.clientOrigins)

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true
  try {
    const url = new URL(origin)
    if (
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
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
      return
    }
    callback(new HttpError(403, 'Origin is not allowed'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))
app.use(session({
  name: 'learnwell.sid',
  store: new PgSessionStore({ pool, createTableIfMissing: true }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: 'auto',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}))

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/assistant', assistantRouter)
app.use('/api', (_request, _response, next) => next(new HttpError(404, 'API route not found')))

const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((_request, response) => {
    response.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use(errorHandler)
