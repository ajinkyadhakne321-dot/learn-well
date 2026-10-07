import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { HttpError } from './errorHandler.js'

const allowedOrigins = new Set(env.clientOrigins)

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin')
  if (!origin || allowedOrigins.has(origin)) {
    next()
    return
  }

  const host = request.get('x-forwarded-host') || request.get('host')
  try {
    const originUrl = new URL(origin)
    if (host && (originUrl.host === host || originUrl.hostname === host)) {
      next()
      return
    }
    if (
      originUrl.hostname.endsWith('.trycloudflare.com') ||
      originUrl.hostname.endsWith('.loca.lt') ||
      originUrl.hostname.endsWith('.ngrok-free.app') ||
      originUrl.hostname === 'localhost' ||
      originUrl.hostname === '127.0.0.1'
    ) {
      next()
      return
    }
  } catch {}

  next(new HttpError(403, 'Origin is not allowed'))
}