import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { HttpError } from '../middleware/errorHandler.js'

export const announcementRouter = Router()

announcementRouter.use(requireAuth)

// GET /api/announcements
announcementRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!
  const { courseId } = req.query

  let query = ''
  const params: unknown[] = []

  if (user.role === 'teacher') {
    query = `
      SELECT a.*, c.title AS course_title, c.code AS course_code, u.name AS teacher_name
      FROM announcements a
      JOIN courses c ON c.id = a.course_id
      JOIN users u ON u.id = a.teacher_id
      WHERE (a.teacher_id = $1 OR c.teacher_id = $1)
    `
    params.push(user.id)
  } else {
    // Student
    query = `
      SELECT a.*, c.title AS course_title, c.code AS course_code, u.name AS teacher_name
      FROM announcements a
      JOIN courses c ON c.id = a.course_id
      JOIN users u ON u.id = a.teacher_id
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
    `
    params.push(user.id)
  }

  if (courseId) {
    params.push(courseId)
    query += ` AND a.course_id = $${params.length}`
  }

  query += ` ORDER BY a.created_at DESC`

  const result = await pool.query(query, params)
  res.json({ announcements: result.rows })
}))

const createAnnouncementSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  content: z.string().trim().min(5),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
})

// POST /api/announcements (Teacher only)
announcementRouter.post('/', requireRole('teacher'), asyncHandler(async (req, res) => {
  const user = req.user!
  const input = createAnnouncementSchema.parse(req.body)

  const courseRes = await pool.query(
    `SELECT id FROM courses WHERE id = $1 AND teacher_id = $2`,
    [input.courseId, user.id],
  )
  if (courseRes.rows.length === 0) {
    throw new HttpError(403, 'You can only publish announcements for your own courses.')
  }

  const result = await pool.query(
    `INSERT INTO announcements (course_id, teacher_id, title, content, priority)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.courseId, user.id, input.title, input.content, input.priority],
  )

  res.status(201).json({ announcement: result.rows[0] })
}))

// DELETE /api/announcements/:id (Teacher only)
announcementRouter.delete('/:id', requireRole('teacher'), asyncHandler(async (req, res) => {
  const user = req.user!
  const { id } = req.params

  const check = await pool.query(
    `SELECT a.id FROM announcements a
     JOIN courses c ON c.id = a.course_id
     WHERE a.id = $1 AND (a.teacher_id = $2 OR c.teacher_id = $2)`,
    [id, user.id],
  )
  if (check.rows.length === 0) {
    throw new HttpError(404, 'Announcement not found or permission denied.')
  }

  await pool.query(`DELETE FROM announcements WHERE id = $1`, [id])
  res.status(204).end()
}))
