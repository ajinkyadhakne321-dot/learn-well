import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { HttpError } from '../middleware/errorHandler.js'
import type { UserRow } from '../types/user.js'

const passwordCost = 12

export async function registerUser(name: string, email: string, password: string): Promise<UserRow> {
  const passwordHash = await bcrypt.hash(password, passwordCost)
  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, password_hash, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), passwordHash],
    )
    return result.rows[0]
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

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}