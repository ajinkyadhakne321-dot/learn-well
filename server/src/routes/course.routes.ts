import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { HttpError } from '../middleware/errorHandler.js'

export const courseRouter = Router()

courseRouter.use(requireAuth)

// GET /api/courses
courseRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!
  if (user.role === 'teacher') {
    const result = await pool.query(
      `SELECT c.*,
              COUNT(DISTINCT ce.student_id)::int AS student_count,
              COUNT(DISTINCT sm.id)::int AS material_count,
              COUNT(DISTINCT a.id)::int AS assignment_count,
              COUNT(DISTINCT q.id)::int AS quiz_count
       FROM courses c
       LEFT JOIN course_enrollments ce ON ce.course_id = c.id
       LEFT JOIN study_materials sm ON sm.course_id = c.id
       LEFT JOIN assignments a ON a.course_id = c.id
       LEFT JOIN quizzes q ON q.course_id = c.id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [user.id],
    )
    return res.json({ courses: result.rows })
  }

  // Student: courses enrolled in
  const result = await pool.query(
    `SELECT c.*,
            u.name AS teacher_name,
            u.email AS teacher_email,
            COUNT(DISTINCT sm.id)::int AS material_count,
            COUNT(DISTINCT a.id)::int AS assignment_count,
            COUNT(DISTINCT q.id)::int AS quiz_count
     FROM courses c
     JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
     LEFT JOIN users u ON u.id = c.teacher_id
     LEFT JOIN study_materials sm ON sm.course_id = c.id AND sm.published = true
     LEFT JOIN assignments a ON a.course_id = c.id AND a.published = true
     LEFT JOIN quizzes q ON q.course_id = c.id AND q.published = true
     GROUP BY c.id, u.name, u.email
     ORDER BY c.title ASC`,
    [user.id],
  )
  res.json({ courses: result.rows })
}))

const createCourseSchema = z.object({
  code: z.string().trim().min(2).max(50),
  title: z.string().trim().min(2).max(200),
  subject: z.string().trim().min(2).max(100),
  semester: z.string().trim().min(2).max(50),
  description: z.string().trim().max(1000).optional(),
})

// POST /api/courses (Teacher only)
courseRouter.post('/', requireRole('teacher'), asyncHandler(async (req, res) => {
  const user = req.user!
  const input = createCourseSchema.parse(req.body)

  const existing = await pool.query(`SELECT id FROM courses WHERE LOWER(code) = LOWER($1)`, [input.code])
  if (existing.rows.length > 0) {
    throw new HttpError(409, `A course with code ${input.code} already exists.`)
  }

  const result = await pool.query(
    `INSERT INTO courses (code, title, subject, semester, description, teacher_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.code.toUpperCase(), input.title, input.subject, input.semester, input.description || null, user.id],
  )

  res.status(201).json({ course: result.rows[0] })
}))

// GET /api/courses/:id
courseRouter.get('/:id', asyncHandler(async (req, res) => {
  const user = req.user!
  const courseId = req.params.id

  const courseRes = await pool.query(
    `SELECT c.*, u.name AS teacher_name, u.email AS teacher_email
     FROM courses c
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE c.id = $1`,
    [courseId],
  )

  const course = courseRes.rows[0]
  if (!course) throw new HttpError(404, 'Course not found')

  if (user.role === 'teacher' && course.teacher_id !== user.id) {
    throw new HttpError(403, 'You are not authorized to manage this course')
  }

  if (user.role === 'student') {
    const enrollRes = await pool.query(
      `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
      [courseId, user.id],
    )
    if (enrollRes.rows.length === 0) {
      throw new HttpError(403, 'You are not enrolled in this course')
    }
  }

  // Fetch materials, assignments, announcements, students
  const materialsRes = await pool.query(
    `SELECT * FROM study_materials
     WHERE course_id = $1 ${user.role === 'student' ? 'AND published = true' : ''}
     ORDER BY created_at DESC`,
    [courseId],
  )

  const assignmentsRes = await pool.query(
    `SELECT a.*,
            ${user.role === 'student'
              ? `sub.id AS submission_id, sub.status AS submission_status, sub.grade, sub.feedback`
              : `COUNT(sub.id)::int AS submission_count`}
     FROM assignments a
     LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id ${user.role === 'student' ? `AND sub.student_id = '${user.id}'` : ''}
     WHERE a.course_id = $1 ${user.role === 'student' ? 'AND a.published = true' : ''}
     GROUP BY a.id ${user.role === 'student' ? ', sub.id, sub.status, sub.grade, sub.feedback' : ''}
     ORDER BY a.due_date ASC`,
    [courseId],
  )

  const announcementsRes = await pool.query(
    `SELECT * FROM announcements WHERE course_id = $1 ORDER BY created_at DESC`,
    [courseId],
  )

  let students: unknown[] = []
  if (user.role === 'teacher') {
    const studentsRes = await pool.query(
      `SELECT u.id, u.name, u.email, ce.enrolled_at,
              (SELECT COUNT(*)::int FROM material_progress mp
               JOIN study_materials sm ON sm.id = mp.material_id
               WHERE sm.course_id = $1 AND mp.student_id = u.id AND mp.completed = true) AS completed_materials,
              (SELECT COUNT(*)::int FROM assignment_submissions sub
               JOIN assignments a ON a.id = sub.assignment_id
               WHERE a.course_id = $1 AND sub.student_id = u.id) AS submitted_assignments
       FROM users u
       JOIN course_enrollments ce ON ce.student_id = u.id AND ce.course_id = $1
       ORDER BY u.name ASC`,
      [courseId],
    )
    students = studentsRes.rows
  }

  res.json({
    course,
    materials: materialsRes.rows,
    assignments: assignmentsRes.rows,
    announcements: announcementsRes.rows,
    students,
  })
}))
