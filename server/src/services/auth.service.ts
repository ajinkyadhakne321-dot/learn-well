import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { pool } from '../db/pool.js'
import { HttpError } from '../middleware/errorHandler.js'
import type { UserRole, UserRow } from '../types/user.js'

const passwordCost = 12

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: UserRole = 'student',
  teacherCode?: string,
): Promise<UserRow> {
  if (role === 'teacher') {
    if (!teacherCode || teacherCode.trim() !== env.teacherInviteCode) {
      throw new HttpError(403, 'Invalid or missing teacher authorization code. Teacher registration must be authorized.')
    }
  }

  const passwordHash = await bcrypt.hash(password, passwordCost)
  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, password_hash, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), passwordHash, role],
    )
    const newUser = result.rows[0]

    // If new user is a student, automatically enroll them in available courses
    if (role === 'student') {
      await pool.query(
        `INSERT INTO course_enrollments (course_id, student_id)
         SELECT id, $1 FROM courses
         ON CONFLICT DO NOTHING`,
        [newUser.id],
      )
    }

    return newUser
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, 'An account with this email already exists')
    throw error
  }
}

export async function authenticateUser(email: string, password: string): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email.trim()],
  )
  const user = result.rows[0]
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Email or password is incorrect')
  }
  return user
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  )
  return result.rows[0]
}

export async function createPasswordResetToken(email: string): Promise<{ token: string; email: string } | null> {
  const result = await pool.query<UserRow>(
    `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email.trim()],
  )
  const user = result.rows[0]
  if (!user) return null

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt],
  )

  return { token: rawToken, email: user.email }
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')

  const resetRes = await pool.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM password_resets
     WHERE token_hash = $1 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash],
  )

  const resetRecord = resetRes.rows[0]
  if (!resetRecord) {
    throw new HttpError(400, 'Password reset link is invalid or has expired.')
  }

  const passwordHash = await bcrypt.hash(newPassword, passwordCost)

  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, resetRecord.user_id])
  await pool.query(`UPDATE password_resets SET used = true WHERE id = $1`, [resetRecord.id])
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await findUserById(userId)
  if (!user) throw new HttpError(404, 'User not found')

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash)
  if (!isMatch) throw new HttpError(400, 'Current password is incorrect')

  const newHash = await bcrypt.hash(newPassword, passwordCost)
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId])
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}