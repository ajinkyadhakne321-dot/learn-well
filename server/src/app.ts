import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import express from 'express'
import { createRequire } from 'node:module'
import type { RequestHandler } from 'express'
import type { SessionOptions } from 'express-session'
import helmet from 'helmet'
import { env } from './config/env.js'
import { pool } from './db/pool.js'
import { errorHandler, HttpError } from './middleware/errorHandler.js'
import { authRouter } from './routes/auth.routes.js'
import { healthRouter } from './routes/health.routes.js'

const require = createRequire(import.meta.url)
const session = require('express-session') as (options?: SessionOptions) => RequestHandler
const PgSessionStore = connectPgSimple(session)
const allowedOrigins = new Set(env.clientOrigins)

export const app = express()

if (env.nodeEnv === 'production') app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
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
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}))

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api', (_request, _response, next) => next(new HttpError(404, 'API route not found')))
app.use(errorHandler)