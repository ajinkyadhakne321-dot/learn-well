import { rateLimit } from 'express-rate-limit'
import { Router } from 'express'
import { currentUser, login, logout, register } from '../controllers/auth.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js'

export const authRouter = Router()

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: 'Too many authentication attempts. Try again later.' }),
})

authRouter.post('/register', authRateLimit, requireTrustedOrigin, asyncHandler(register))
authRouter.post('/login', authRateLimit, requireTrustedOrigin, asyncHandler(login))
authRouter.post('/logout', requireTrustedOrigin, logout)
authRouter.get('/me', asyncHandler(currentUser))