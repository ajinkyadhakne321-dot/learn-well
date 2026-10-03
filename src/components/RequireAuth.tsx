import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SessionStatus({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <main className="auth-screen">
      <div className="auth-status" role={retry ? 'alert' : 'status'}>
        <p>{message}</p>
        {retry && <button className="button button-primary" type="button" onClick={retry}>Retry connection</button>}
      </div>
    </main>
  )
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, status, error, retrySession } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <SessionStatus message="Checking your student session…" />
  if (status === 'error') return <SessionStatus message={error} retry={retrySession} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

export function RedirectAuthenticated({ children }: PropsWithChildren) {
  const { user, status } = useAuth()
  if (status === 'loading') return <SessionStatus message="Checking your student session…" />
  if (user) return <Navigate to="/" replace />
  return children
}