import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  void _next
  if (error instanceof SyntaxError && 'body' in error) {
    response.status(400).json({ error: 'Request body must contain valid JSON' })
    return
  }
  if (error instanceof ZodError) {
    response.status(400).json({ error: 'Invalid request data', details: error.issues.map(({ path, message }) => ({ path, message })) })
    return
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500
  if (statusCode >= 500) console.error('Request failed:', error)
  const message = error instanceof HttpError ? error.message : 'An unexpected server error occurred'
  response.status(statusCode).json({ error: message })
}