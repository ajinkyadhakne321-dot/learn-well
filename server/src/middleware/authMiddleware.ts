import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { HttpError } from './errorHandler.js'
import { findUserById } from '../services/auth.service.js'
import type { UserRole, UserRow } from '../types/user.js'

declare global {
  namespace Express {
    interface Request {
      user?: UserRow
    }
  }
}

export const requireAuth: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.session?.userId
  if (!userId) {
    return next(new HttpError(401, 'Authentication is required'))
  }

  try {
    const user = await findUserById(userId)
    if (!user) {
      req.session.destroy(() => undefined)
      return next(new HttpError(401, 'Authentication is required'))
    }
    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication is required'))
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new HttpError(403, `Access forbidden. This section is restricted to ${allowedRoles.join(' or ')} accounts.`))
    }
    next()
  }
}
