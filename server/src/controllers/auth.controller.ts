import type { Request, RequestHandler } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { HttpError } from '../middleware/errorHandler.js'
import { authenticateUser, findUserById, registerUser } from '../services/auth.service.js'
import { toPublicUser } from '../types/user.js'

const emailSchema = z.string().trim().email().max(254)
const passwordSchema = z.string().min(12).max(72).refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be at most 72 bytes')

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
})

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be at most 72 bytes'),
})

function establishSession(request: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError)
        return
      }
      request.session.userId = userId
      request.session.save((saveError) => saveError ? reject(saveError) : resolve())
    })
  })
}

export const register: RequestHandler = async (request, response) => {
  const input = registrationSchema.parse(request.body)
  const user = await registerUser(input.name, input.email, input.password)
  await establishSession(request, user.id)
  response.status(201).json({ user: toPublicUser(user) })
}

export const login: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body)
  const user = await authenticateUser(input.email, input.password)
  await establishSession(request, user.id)
  response.json({ user: toPublicUser(user) })
}

export const logout: RequestHandler = (request, response, next) => {
  request.session.destroy((error) => {
    if (error) {
      next(error)
      return
    }
    response.clearCookie('learnwell.sid', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
    })
    response.status(204).end()
  })
}

export const currentUser: RequestHandler = async (request, response) => {
  const userId = request.session.userId
  if (!userId) throw new HttpError(401, 'Authentication is required')
  const user = await findUserById(userId)
  if (!user) {
    request.session.destroy(() => undefined)
    throw new HttpError(401, 'Authentication is required')
  }
  response.json({ user: toPublicUser(user) })
}