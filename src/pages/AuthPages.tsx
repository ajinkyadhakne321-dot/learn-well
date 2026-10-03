import { useState, type FormEvent } from 'react'
import { ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthApiError } from '../services/authApi'

type AuthPageProps = { mode: 'login' | 'register' }

export function AuthPage({ mode }: AuthPageProps) {
  const isRegistration = mode === 'register'
  const { error: sessionError, login, register, status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { from?: { pathname?: string }; message?: string } | null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      if (isRegistration) await register({ name, email, password })
      else await login({ email, password })
      const returnPath = state?.from?.pathname
      const destination = returnPath?.startsWith('/') && !returnPath.startsWith('//') ? returnPath : '/'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setFormError(requestError instanceof AuthApiError ? requestError.message : 'We could not complete your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#auth-main">Skip to main content</a>
      <main id="auth-main" className="auth-screen">
        <Link className="brand auth-brand" to="/login" aria-label="Learnwell student sign in">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </Link>
        <section className="auth-panel" aria-labelledby="auth-title">
          <p className="eyebrow">STUDENT ACCOUNT</p>
          <h1 id="auth-title" tabIndex={-1}>{isRegistration ? 'Create your account' : 'Welcome back'}</h1>
          <p className="auth-intro">{isRegistration ? 'Create a secure account to enter your learning space.' : 'Sign in to continue to your learning space.'}</p>
          {state?.message && <p className="auth-success" role="status">{state.message}</p>}
          {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
          {formError && <p className="form-error" role="alert" aria-live="assertive">{formError}</p>}
          <form className="settings-form auth-form" onSubmit={handleSubmit} aria-busy={submitting}>
            {isRegistration && <>
              <label htmlFor="auth-name">Full name</label>
              <input id="auth-name" name="name" type="text" autoComplete="name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} />
            </>}
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" name="password" type="password" autoComplete={isRegistration ? 'new-password' : 'current-password'} minLength={isRegistration ? 12 : 1} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={isRegistration ? 'password-requirement' : undefined} />
            {isRegistration && <p className="auth-hint" id="password-requirement">Use at least 12 characters.</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              {isRegistration ? <UserPlus size={17} aria-hidden="true" /> : <LogIn size={17} aria-hidden="true" />}
              {submitting ? 'Please wait…' : isRegistration ? 'Create account' : 'Sign in'}
            </button>
            <span className="visually-hidden" role="status" aria-live="polite">{submitting ? 'Submitting account details' : ''}</span>
          </form>
          <p className="auth-switch">
            {isRegistration ? 'Already have an account?' : 'New to Learnwell?'}{' '}
            <Link to={isRegistration ? '/login' : '/register'}>{isRegistration ? 'Sign in' : 'Create an account'} <ArrowRight size={14} aria-hidden="true" /></Link>
          </p>
        </section>
        <p className="auth-footnote">Your sign-in session is protected with a secure, server-managed cookie.</p>
      </main>
    </>
  )
}

export function LogoutPage() {
  const { user, status, error: sessionError, logout, retrySession } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <main className="auth-screen"><p role="status">Checking your student session…</p></main>
  if (status === 'error') return <main className="auth-screen"><div className="auth-status" role="alert"><p>{sessionError}</p><button className="button button-primary" type="button" onClick={retrySession}>Retry connection</button></div></main>
  if (!user) return <Navigate to="/login" replace />

  async function handleLogout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await logout()
      navigate('/login', { replace: true, state: { message: 'You have signed out.' } })
    } catch {
      setError('We could not end your session. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#logout-main">Skip to main content</a>
      <main id="logout-main" className="auth-screen">
        <Link className="brand auth-brand" to="/" aria-label="Learnwell student space">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </Link>
        <section className="auth-panel" aria-labelledby="logout-title">
          <p className="eyebrow">STUDENT ACCOUNT</p>
          <h1 id="logout-title">Sign out</h1>
          <p className="auth-intro">You are signed in as {user.email}.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <form className="auth-form" onSubmit={handleLogout} aria-busy={submitting}>
            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? 'Signing out…' : 'Sign out'}</button>
            <span className="visually-hidden" role="status" aria-live="polite">{submitting ? 'Signing out' : ''}</span>
            <Link className="auth-cancel" to="/">Return to your learning space</Link>
          </form>
        </section>
      </main>
    </>
  )
}