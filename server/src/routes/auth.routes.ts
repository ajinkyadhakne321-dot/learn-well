import { rateLimit } from 'express-rate-limit'
import { Router } from 'express'
import {
  changePassword,
  currentUser,
  forgotPassword,
  login,
  logout,
  register,
  resetPassword,
} from '../controllers/auth.controller.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { requireTrustedOrigin } from '../middleware/requireTrustedOrigin.js'

export const authRouter = Router()

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => response.status(429).json({ error: 'Too many authentication attempts. Try again later.' }),
})

authRouter.post('/register', authRateLimit, requireTrustedOrigin, asyncHandler(register))
authRouter.post('/login', authRateLimit, requireTrustedOrigin, asyncHandler(login))
authRouter.post('/logout', requireTrustedOrigin, logout)
authRouter.get('/me', asyncHandler(currentUser))
authRouter.post('/forgot-password', authRateLimit, requireTrustedOrigin, asyncHandler(forgotPassword))
authRouter.post('/reset-password', authRateLimit, requireTrustedOrigin, asyncHandler(resetPassword))
authRouter.post('/change-password', requireAuth, requireTrustedOrigin, asyncHandler(changePassword))