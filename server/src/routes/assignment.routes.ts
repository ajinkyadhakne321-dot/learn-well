import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { HttpError } from '../middleware/errorHandler.js'
import { submissionUpload } from '../services/storageService.js'

export const assignmentRouter = Router()

assignmentRouter.use(requireAuth)

// GET /api/assignments
assignmentRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!
  const { courseId } = req.query

  let query = ''
  const params: unknown[] = []

  if (user.role === 'teacher') {
    query = `
      SELECT a.*, c.title AS course_title, c.code AS course_code,
             COUNT(sub.id)::int AS submission_count,
             COUNT(CASE WHEN sub.grade IS NULL THEN 1 END)::int AS pending_review_count
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
      WHERE (a.teacher_id = $1 OR c.teacher_id = $1)
    `
    params.push(user.id)
  } else {
    // Student
    query = `
      SELECT a.*, c.title AS course_title, c.code AS course_code,
             sub.id AS submission_id,
             sub.status AS submission_status,
             sub.grade,
             sub.feedback,
             sub.submitted_at
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = $1
      WHERE a.published = true
    `
    params.push(user.id)
  }

  if (courseId) {
    params.push(courseId)
    query += ` AND a.course_id = $${params.length}`
  }

  query += ` GROUP BY a.id, c.title, c.code ${user.role === 'student' ? ', sub.id, sub.status, sub.grade, sub.feedback, sub.submitted_at' : ''} ORDER BY a.due_date ASC`

  const result = await pool.query(query, params)
  res.json({ assignments: result.rows })
}))

const createAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5),
  dueDate: z.string().datetime().or(z.string().min(10)),
  points: z.coerce.number().int().min(1).max(1000).default(100),
  published: z.boolean().default(true),
})

// POST /api/assignments (Teacher only)
assignmentRouter.post('/', requireRole('teacher'), asyncHandler(async (req, res) => {
  const user = req.user!
  const input = createAssignmentSchema.parse(req.body)

  // Verify course ownership
  const courseRes = await pool.query(
    `SELECT id FROM courses WHERE id = $1 AND teacher_id = $2`,
    [input.courseId, user.id],
  )
  if (courseRes.rows.length === 0) {
    throw new HttpError(403, 'You can only create assignments in your own courses.')
  }

  const result = await pool.query(
    `INSERT INTO assignments (course_id, teacher_id, title, description, due_date, points, published)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [input.courseId, user.id, input.title, input.description, new Date(input.dueDate), input.points, input.published],
  )

  res.status(201).json({ assignment: result.rows[0] })
}))

// GET /api/assignments/:id
assignmentRouter.get('/:id', asyncHandler(async (req, res) => {
  const user = req.user!
  const assignmentId = req.params.id

  const assignmentRes = await pool.query(
    `SELECT a.*, c.title AS course_title, c.code AS course_code, c.teacher_id AS course_teacher_id
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     WHERE a.id = $1`,
    [assignmentId],
  )
  const assignment = assignmentRes.rows[0]
  if (!assignment) throw new HttpError(404, 'Assignment not found')

  if (user.role === 'teacher') {
    if (assignment.course_teacher_id !== user.id && assignment.teacher_id !== user.id) {
      throw new HttpError(403, 'Access denied.')
    }
    // Load all submissions for this assignment
    const submissionsRes = await pool.query(
      `SELECT sub.*, u.name AS student_name, u.email AS student_email
       FROM assignment_submissions sub
       JOIN users u ON u.id = sub.student_id
       WHERE sub.assignment_id = $1
       ORDER BY sub.submitted_at DESC`,
      [assignmentId],
    )
    return res.json({ assignment, submissions: submissionsRes.rows })
  }

  // Student: verify enrollment & fetch own submission
  const enrollRes = await pool.query(
    `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
    [assignment.course_id, user.id],
  )
  if (enrollRes.rows.length === 0) {
    throw new HttpError(403, 'You are not enrolled in this course.')
  }

  const mySubRes = await pool.query(
    `SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2`,
    [assignmentId, user.id],
  )

  res.json({ assignment, submission: mySubRes.rows[0] || null })
}))

// POST /api/assignments/:id/submit (Student submission)
assignmentRouter.post(
  '/:id/submit',
  requireRole('student'),
  submissionUpload.single('file'),
  asyncHandler(async (req, res) => {
    const user = req.user!
    const assignmentId = req.params.id
    const { submissionText } = req.body

    const assignmentRes = await pool.query(
      `SELECT a.* FROM assignments a
       JOIN course_enrollments ce ON ce.course_id = a.course_id AND ce.student_id = $2
       WHERE a.id = $1 AND a.published = true`,
      [assignmentId, user.id],
    )
    if (assignmentRes.rows.length === 0) {
      throw new HttpError(403, 'Assignment not available or you are not enrolled.')
    }

    const file = req.file
    const fileName = file ? file.originalname : null
    const filePath = file ? file.path : null

    if (!submissionText?.trim() && !file) {
      throw new HttpError(400, 'Please provide text answers or attach a file.')
    }

    const result = await pool.query(
      `INSERT INTO assignment_submissions
       (assignment_id, student_id, submission_text, file_name, file_path, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, 'submitted', NOW())
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET
         submission_text = EXCLUDED.submission_text,
         file_name = COALESCE(EXCLUDED.file_name, assignment_submissions.file_name),
         file_path = COALESCE(EXCLUDED.file_path, assignment_submissions.file_path),
         status = 'submitted',
         submitted_at = NOW()
       RETURNING *`,
      [assignmentId, user.id, submissionText?.trim() || null, fileName, filePath],
    )

    res.status(201).json({ submission: result.rows[0] })
  }),
)

const gradeSubmissionSchema = z.object({
  grade: z.coerce.number().min(0).max(1000),
  feedback: z.string().trim().max(2000).optional(),
})

// POST /api/assignments/submissions/:submissionId/grade (Teacher only)
assignmentRouter.post(
  '/submissions/:submissionId/grade',
  requireRole('teacher'),
  asyncHandler(async (req, res) => {
    const user = req.user!
    const { submissionId } = req.params
    const { grade, feedback } = gradeSubmissionSchema.parse(req.body)

    const check = await pool.query(
      `SELECT sub.id FROM assignment_submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       JOIN courses c ON c.id = a.course_id
       WHERE sub.id = $1 AND (a.teacher_id = $2 OR c.teacher_id = $2)`,
      [submissionId, user.id],
    )
    if (check.rows.length === 0) {
      throw new HttpError(403, 'Permission denied.')
    }

    const result = await pool.query(
      `UPDATE assignment_submissions
       SET grade = $1, feedback = $2, status = 'graded', graded_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [grade, feedback || null, submissionId],
    )

    res.json({ submission: result.rows[0] })
  }),
)

// GET /api/assignments/submissions/:submissionId/download
assignmentRouter.get('/submissions/:submissionId/download', asyncHandler(async (req, res) => {
  const user = req.user!
  const { submissionId } = req.params

  const result = await pool.query(
    `SELECT sub.*, a.teacher_id, c.teacher_id AS course_teacher_id
     FROM assignment_submissions sub
     JOIN assignments a ON a.id = sub.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE sub.id = $1`,
    [submissionId],
  )
  const sub = result.rows[0]
  if (!sub) throw new HttpError(404, 'Submission not found')

  if (user.role === 'student' && sub.student_id !== user.id) {
    throw new HttpError(403, 'Access denied.')
  }
  if (user.role === 'teacher' && sub.teacher_id !== user.id && sub.course_teacher_id !== user.id) {
    throw new HttpError(403, 'Access denied.')
  }

  if (!sub.file_path || !fs.existsSync(sub.file_path)) {
    throw new HttpError(404, 'File not found.')
  }

  res.download(sub.file_path, sub.file_name || 'assignment-submission')
}))
