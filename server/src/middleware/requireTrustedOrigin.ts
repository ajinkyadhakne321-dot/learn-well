import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { HttpError } from './errorHandler.js'

const allowedOrigins = new Set(env.clientOrigins)

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin')
  if (origin && !allowedOrigins.has(origin)) {
    next(new HttpError(403, 'Origin is not allowed'))
    return
  }
  next()
}