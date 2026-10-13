import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi, AuthApiError, type UserRole } from '../services/authApi'

export function LoginSelectionPage() {
  const { user, status } = useAuth()

  if (status === 'authenticated' && user) {
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />
  }

  return (
    <>
      <a className="skip-link" href="#portal-selection-main">Skip to portal selection</a>
      <main id="portal-selection-main" className="auth-screen">
        <div className="brand auth-brand" aria-label="Learnwell Accessible Platform">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </div>

        <section className="portal-selection-panel" aria-labelledby="portal-title">
          <p className="eyebrow">ACCESSIBLE LEARNING PLATFORM</p>
          <h1 id="portal-title" tabIndex={-1}>Choose your learning portal</h1>
          <p className="auth-intro">
            Welcome to Learnwell. Please select whether you are signing in as a student or as an educator.
          </p>

          <div className="portal-grid" role="region" aria-label="Available portal options">
            {/* Student Portal Card */}
            <article className="portal-card" aria-labelledby="student-portal-heading">
              <span className="portal-card-badge">Student Access</span>
              <div className="portal-card-header">
                <div className="portal-card-icon" aria-hidden="true">
                  <GraduationCap size={24} />
                </div>
                <h2 id="student-portal-heading">Student Portal</h2>
              </div>
              <p className="portal-card-desc">
                Access your personalized courses, audio study materials, AI voice assistant, assignments, quizzes, and learning progress.
              </p>
              <div className="portal-card-actions">
                <Link
                  to="/login?role=student"
                  className="button button-primary"
                  aria-label="Sign in to the Student Portal"
                >
                  <LogIn size={16} aria-hidden="true" />
                  <span>Student Sign In</span>
                </Link>
                <Link
                  to="/register?role=student"
                  className="button-secondary"
                  aria-label="Create a new Student account"
                >
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Create Student Account</span>
                </Link>
              </div>
            </article>

            {/* Teacher Portal Card */}
            <article className="portal-card teacher-card" aria-labelledby="teacher-portal-heading">
              <span className="portal-card-badge badge-teacher">Instructor Access</span>
              <div className="portal-card-header">
                <div className="portal-card-icon" aria-hidden="true">
                  <BookOpen size={24} />
                </div>
                <h2 id="teacher-portal-heading">Teacher Portal</h2>
              </div>
              <p className="portal-card-desc">
                Manage your courses, upload study materials (PDF/DOCX), publish notes and quizzes, grade student submissions, and view class analytics.
              </p>
              <div className="portal-card-actions">
                <Link
                  to="/login?role=teacher"
                  className="button button-primary"
                  aria-label="Sign in to the Teacher Portal"
                >
                  <ShieldCheck size={16} aria-hidden="true" />
                  <span>Teacher Sign In</span>
                </Link>
                <Link
                  to="/register?role=teacher"
                  className="button-secondary"
                  aria-label="Register a new Teacher account with authorization code"
                >
                  <KeyRound size={16} aria-hidden="true" />
                  <span>Teacher Registration</span>
                </Link>
              </div>
            </article>
          </div>
        </section>

        <p className="auth-footnote">
          Learnwell provides high-contrast text, screen reader compatibility, and full keyboard navigation.
        </p>
      </main>
    </>
  )
}

type AuthPageProps = { mode: 'login' | 'register' }

export function AuthPage({ mode }: AuthPageProps) {
  const [searchParams] = useSearchParams()
  const roleParam = searchParams.get('role') as UserRole | null

  // If no role is specified on /login, display the selection page
  if (!roleParam && mode === 'login') {
    return <LoginSelectionPage />
  }

  const role: UserRole = roleParam === 'teacher' ? 'teacher' : 'student'
  const isRegistration = mode === 'register'
  const isTeacher = role === 'teacher'

  const { error: sessionError, login, register, status, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { from?: { pathname?: string }; message?: string } | null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teacherCode, setTeacherCode] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated' && user) {
    const defaultDest = user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'
    return <Navigate to={defaultDest} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')

    try {
      if (isRegistration) {
        await register({
          name,
          email,
          password,
          role,
          teacherCode: isTeacher ? teacherCode : undefined,
        })
      } else {
        await login({ email, password })
      }

      const returnPath = state?.from?.pathname
      if (returnPath && returnPath.startsWith('/') && !returnPath.startsWith('//')) {
        navigate(returnPath, { replace: true })
      } else {
        navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard', { replace: true })
      }
    } catch (requestError) {
      setFormError(
        requestError instanceof AuthApiError
          ? requestError.message
          : 'We could not complete your request. Please check your credentials and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#auth-main">Skip to main content</a>
      <main id="auth-main" className="auth-screen">
        <Link className="brand auth-brand" to="/login" aria-label="Return to portal selection">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </Link>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              {isTeacher ? 'TEACHER & INSTRUCTOR PORTAL' : 'STUDENT LEARNING PORTAL'}
            </p>
            <Link
              to={isTeacher ? `/${mode}?role=student` : `/${mode}?role=teacher`}
              style={{ fontSize: '12px', fontWeight: 700, color: '#185c4d' }}
              aria-label={isTeacher ? 'Switch to Student portal' : 'Switch to Teacher portal'}
            >
              Switch to {isTeacher ? 'Student' : 'Teacher'}
            </Link>
          </div>

          <h1 id="auth-title" tabIndex={-1}>
            {isRegistration
              ? isTeacher
                ? 'Create Teacher Account'
                : 'Create Student Account'
              : isTeacher
                ? 'Teacher Sign In'
                : 'Student Sign In'}
          </h1>

          <p className="auth-intro">
            {isRegistration
              ? isTeacher
                ? 'Register your instructor account with institutional authorization.'
                : 'Create your secure account to enter your learning workspace.'
              : isTeacher
                ? 'Sign in to manage your courses, study materials, and student progress.'
                : 'Sign in to access your subjects, materials, and learning assistant.'}
          </p>

          {state?.message && <p className="auth-success" role="status">{state.message}</p>}
          {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
          {formError && (
            <p className="form-error" role="alert" aria-live="assertive">
              {formError}
            </p>
          )}

          <form className="settings-form auth-form" onSubmit={handleSubmit} aria-busy={submitting}>
            {isRegistration && (
              <>
                <label htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </>
            )}

            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="auth-password">Password</label>
              {!isRegistration && (
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '12px', color: '#185c4d', textDecoration: 'underline' }}
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              minLength={isRegistration ? 12 : 1}
              maxLength={72}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={isRegistration ? 'password-requirement' : undefined}
            />
            {isRegistration && (
              <p className="auth-hint" id="password-requirement">
                Use at least 12 characters for account security.
              </p>
            )}

            {isRegistration && isTeacher && (
              <>
                <label htmlFor="auth-teacher-code">Teacher Authorization Code</label>
                <input
                  id="auth-teacher-code"
                  name="teacherCode"
                  type="password"
                  required
                  placeholder="e.g. LEARNWELL-TEACHER-2026"
                  value={teacherCode}
                  onChange={(event) => setTeacherCode(event.target.value)}
                  aria-describedby="teacher-code-hint"
                />
                <p className="auth-hint" id="teacher-code-hint">
                  Provided by platform administration to verify educator identity.
                </p>
              </>
            )}

            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              {isRegistration ? (
                <UserPlus size={17} aria-hidden="true" />
              ) : (
                <LogIn size={17} aria-hidden="true" />
              )}
              {submitting
                ? 'Please wait…'
                : isRegistration
                  ? isTeacher
                    ? 'Register as Teacher'
                    : 'Create Student Account'
                  : isTeacher
                    ? 'Sign In as Teacher'
                    : 'Sign In as Student'}
            </button>
            <span className="visually-hidden" role="status" aria-live="polite">
              {submitting ? 'Authenticating…' : ''}
            </span>
          </form>

          <p className="auth-switch">
            {isRegistration ? 'Already registered?' : 'Need an account?'}{' '}
            <Link to={isRegistration ? `/login?role=${role}` : `/register?role=${role}`}>
              {isRegistration ? 'Sign in here' : 'Register here'}{' '}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </p>

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#45534e',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back to Portal Selection</span>
            </Link>
          </div>
        </section>

        <p className="auth-footnote">
          Your sign-in session is protected with secure, server-managed authentication.
        </p>
      </main>
    </>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devToken, setDevToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    setDevToken('')

    try {
      const res = await authApi.forgotPassword(email)
      setMessage(res.message)
      if (res.resetToken) {
        setDevToken(res.resetToken)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process password reset request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#forgot-main">Skip to main content</a>
      <main id="forgot-main" className="auth-screen">
        <Link className="brand auth-brand" to="/login" aria-label="Learnwell portal">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </Link>
        <section className="auth-panel" aria-labelledby="forgot-title">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1 id="forgot-title" tabIndex={-1}>Reset your password</h1>
          <p className="auth-intro">
            Enter your registered email address and we will provide password reset instructions.
          </p>

          {message && (
            <div className="auth-success" role="status">
              <p style={{ margin: 0 }}>{message}</p>
              {devToken && (
                <div style={{ marginTop: '10px', padding: '8px', background: '#fff', border: '1px solid #185c4d' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 'bold' }}>
                    Quick Reset Link (Development Mode):
                  </p>
                  <Link
                    to={`/reset-password?token=${devToken}`}
                    style={{ color: '#185c4d', textDecoration: 'underline', fontSize: '13px' }}
                  >
                    Click here to reset your password with token
                  </Link>
                </div>
              )}
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <form className="settings-form auth-form" onSubmit={handleSubmit} aria-busy={submitting}>
            <label htmlFor="forgot-email">Account email address</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Sending instructions…' : 'Send password reset link'}
            </button>
          </form>

          <p className="auth-switch">
            Remember your credentials?{' '}
            <Link to="/login">Return to sign in <ArrowRight size={14} aria-hidden="true" /></Link>
          </p>
        </section>
      </main>
    </>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const tokenParam = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [token, setToken] = useState(tokenParam)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const res = await authApi.resetPassword({ token, password })
      setSuccess(res.message)
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful! Please sign in with your new password.' } })
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#reset-main">Skip to main content</a>
      <main id="reset-main" className="auth-screen">
        <Link className="brand auth-brand" to="/login" aria-label="Learnwell portal">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </Link>
        <section className="auth-panel" aria-labelledby="reset-title">
          <p className="eyebrow">SET NEW PASSWORD</p>
          <h1 id="reset-title" tabIndex={-1}>Choose new password</h1>

          {success && <p className="auth-success" role="status">{success}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}

          <form className="settings-form auth-form" onSubmit={handleSubmit} aria-busy={submitting}>
            <label htmlFor="reset-token">Reset Token</label>
            <input
              id="reset-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />

            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              minLength={12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="auth-hint">Must be at least 12 characters.</p>

            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              minLength={12}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Updating password…' : 'Update password'}
            </button>
          </form>

          <p className="auth-switch">
            <Link to="/login">Back to Sign In <ArrowRight size={14} aria-hidden="true" /></Link>
          </p>
        </section>
      </main>
    </>
  )
}

export function LogoutPage() {
  const { user, status, error: sessionError, logout, retrySession } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') {
    return (
      <main className="auth-screen">
        <p role="status">Checking your session…</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="auth-screen">
        <div className="auth-status" role="alert">
          <p>{sessionError}</p>
          <button className="button button-primary" type="button" onClick={retrySession}>
            Retry connection
          </button>
        </div>
      </main>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  async function handleLogout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await logout()
      navigate('/login', { replace: true, state: { message: 'You have signed out successfully.' } })
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
        <Link className="brand auth-brand" to="/login" aria-label="Learnwell portal">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">Learn<span>well</span></span>
        </Link>
        <section className="auth-panel" aria-labelledby="logout-title">
          <p className="eyebrow">{user.role === 'teacher' ? 'TEACHER ACCOUNT' : 'STUDENT ACCOUNT'}</p>
          <h1 id="logout-title">Sign out</h1>
          <p className="auth-intro">
            You are signed in as <strong>{user.name}</strong> ({user.email}).
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <form className="auth-form" onSubmit={handleLogout} aria-busy={submitting}>
            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Signing out…' : 'Sign out'}
            </button>
            <span className="visually-hidden" role="status" aria-live="polite">
              {submitting ? 'Signing out' : ''}
            </span>
            <Link
              className="auth-cancel"
              to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
            >
              Return to your workspace
            </Link>
          </form>
        </section>
      </main>
    </>
  )
}