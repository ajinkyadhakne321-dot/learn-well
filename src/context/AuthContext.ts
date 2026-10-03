import { createContext, useContext } from 'react'
import type { AuthUser } from '../services/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  error: string
  login: (credentials: { email: string; password: string }) => Promise<void>
  register: (details: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  retrySession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}