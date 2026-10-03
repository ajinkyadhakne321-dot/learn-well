import { useEffect, useState, type PropsWithChildren } from 'react'
import { AuthContext, type AuthStatus } from './AuthContext'
import { AuthApiError, authApi, type AuthUser } from '../services/authApi'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState('')
  const [sessionAttempt, setSessionAttempt] = useState(0)

  useEffect(() => {
    let active = true
    authApi.currentUser().then(({ user: currentUser }) => {
      if (!active) return
      setUser(currentUser)
      setStatus('authenticated')
      setError('')
    }).catch((requestError: unknown) => {
      if (!active) return
      if (requestError instanceof AuthApiError && requestError.status === 401) {
        setUser(null)
        setStatus('unauthenticated')
        setError('')
        return
      }
      setUser(null)
      setStatus('error')
      setError(requestError instanceof Error ? requestError.message : 'Could not check your sign-in status.')
    })
    return () => { active = false }
  }, [sessionAttempt])

  async function login(credentials: { email: string; password: string }) {
    const result = await authApi.login(credentials)
    setUser(result.user)
    setStatus('authenticated')
    setError('')
  }

  async function register(details: { name: string; email: string; password: string }) {
    const result = await authApi.register(details)
    setUser(result.user)
    setStatus('authenticated')
    setError('')
  }

  async function logout() {
    await authApi.logout()
    setUser(null)
    setStatus('unauthenticated')
    setError('')
  }

  return (
    <AuthContext.Provider value={{
      user,
      status,
      error,
      login,
      register,
      logout,
      retrySession: () => setSessionAttempt((attempt) => attempt + 1),
    }}>
      {children}
    </AuthContext.Provider>
  )
}