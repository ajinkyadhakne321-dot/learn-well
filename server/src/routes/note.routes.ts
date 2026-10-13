import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { HttpError } from '../middleware/errorHandler.js'

export const noteRouter = Router()

noteRouter.use(requireAuth)

// GET /api/notes
noteRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!

  let query = ''
  let params: unknown[] = []

  if (user.role === 'teacher') {
    query = `
      SELECT n.*, c.title AS course_title, c.code AS course_code
      FROM notes n
      LEFT JOIN courses c ON c.id = n.course_id
      WHERE n.user_id = $1
      ORDER BY n.updated_at DESC
    `
    params = [user.id]
  } else {
    // Student: personal notes + shared notes from teachers in enrolled courses
    query = `
      SELECT n.*, c.title AS course_title, c.code AS course_code, u.name AS author_name,
             (n.user_id = $1) AS is_owner
      FROM notes n
      LEFT JOIN courses c ON c.id = n.course_id
      LEFT JOIN users u ON u.id = n.user_id
      LEFT JOIN course_enrollments ce ON ce.course_id = n.course_id AND ce.student_id = $1
      WHERE n.user_id = $1
         OR (n.is_shared = true AND (ce.id IS NOT NULL OR n.course_id IS NULL))
      ORDER BY n.updated_at DESC
    `
    params = [user.id]
  }

  const result = await pool.query(query, params)
  res.json({ notes: result.rows })
}))

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
  subject: z.string().trim().max(100).optional(),
  courseId: z.string().uuid().optional(),
  isShared: z.boolean().default(false),
})

// POST /api/notes
noteRouter.post('/', asyncHandler(async (req, res) => {
  const user = req.user!
  const input = createNoteSchema.parse(req.body)

  const isShared = user.role === 'teacher' ? input.isShared : false

  const result = await pool.query(
    `INSERT INTO notes (user_id, course_id, title, content, subject, is_shared)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user.id, input.courseId || null, input.title, input.content, input.subject || null, isShared],
  )

  res.status(201).json({ note: result.rows[0] })
}))

// PUT /api/notes/:id
noteRouter.put('/:id', asyncHandler(async (req, res) => {
  const user = req.user!
  const { id } = req.params
  const input = createNoteSchema.partial().parse(req.body)

  const existing = await pool.query(`SELECT * FROM notes WHERE id = $1 AND user_id = $2`, [id, user.id])
  if (existing.rows.length === 0) {
    throw new HttpError(404, 'Note not found or permission denied.')
  }

  const current = existing.rows[0]
  const title = input.title ?? current.title
  const content = input.content ?? current.content
  const subject = input.subject !== undefined ? input.subject : current.subject
  const courseId = input.courseId !== undefined ? input.courseId : current.course_id
  const isShared = user.role === 'teacher' && input.isShared !== undefined ? input.isShared : current.is_shared

  const result = await pool.query(
    `UPDATE notes
     SET title = $1, content = $2, subject = $3, course_id = $4, is_shared = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [title, content, subject, courseId, isShared, id],
  )

  res.json({ note: result.rows[0] })
}))

// DELETE /api/notes/:id
noteRouter.delete('/:id', asyncHandler(async (req, res) => {
  const user = req.user!
  const { id } = req.params

  const check = await pool.query(`SELECT id FROM notes WHERE id = $1 AND user_id = $2`, [id, user.id])
  if (check.rows.length === 0) {
    throw new HttpError(404, 'Note not found or permission denied.')
  }

  await pool.query(`DELETE FROM notes WHERE id = $1`, [id])
  res.status(204).end()
}))
