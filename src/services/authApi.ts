export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'student'
  createdAt: string
}

type AuthResponse = { user: AuthUser }
type ApiErrorResponse = { error?: string }

export class AuthApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

async function request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/auth/${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new AuthApiError('The authentication service could not be reached. Check that the API server is running.')
  }

  const payload: T | ApiErrorResponse | undefined = response.status === 204
    ? undefined
    : await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = (payload as ApiErrorResponse | undefined)?.error ?? 'The request could not be completed.'
    throw new AuthApiError(message, response.status)
  }
  return payload as T
}

export const authApi = {
  currentUser: () => request<AuthResponse>('me', 'GET'),
  login: (credentials: { email: string; password: string }) => request<AuthResponse>('login', 'POST', credentials),
  register: (details: { name: string; email: string; password: string }) => request<AuthResponse>('register', 'POST', details),
  logout: () => request<void>('logout', 'POST'),
}