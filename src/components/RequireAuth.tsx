import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../services/authApi'

function SessionStatus({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <main className="auth-screen">
      <div className="auth-status" role={retry ? 'alert' : 'status'}>
        <p>{message}</p>
        {retry && (
          <button className="button button-primary" type="button" onClick={retry}>
            Retry connection
          </button>
        )}
      </div>
    </main>
  )
}

type RequireAuthProps = PropsWithChildren<{
  allowedRoles?: UserRole[]
}>

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { user, status, error, retrySession } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionStatus message="Checking your secure session…" />
  if (status === 'error') return <SessionStatus message={error} retry={retrySession} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the appropriate home dashboard for their role
    const fallbackPath = user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

export function RedirectAuthenticated({ children }: PropsWithChildren) {
  const { user, status } = useAuth()
  if (status === 'loading') return <SessionStatus message="Checking your session…" />
  if (user) {
    const destination = user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    return <Navigate to={destination} replace />
  }
  return <>{children}</>
}