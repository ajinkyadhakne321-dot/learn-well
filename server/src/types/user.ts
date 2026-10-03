export type PublicUser = {
  id: string
  name: string
  email: string
  role: 'student'
  createdAt: string
}

export type UserRow = {
  id: string
  name: string
  email: string
  password_hash: string
  role: 'student'
  created_at: Date
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at.toISOString(),
  }
}