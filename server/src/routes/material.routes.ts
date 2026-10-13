import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { HttpError } from '../middleware/errorHandler.js'
import { materialUpload } from '../services/storageService.js'

export const materialRouter = Router()

materialRouter.use(requireAuth)

// GET /api/materials
materialRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!
  const { courseId, subject } = req.query

  let query = ''
  const params: unknown[] = []

  if (user.role === 'teacher') {
    query = `
      SELECT sm.*, c.title AS course_title, c.code AS course_code
      FROM study_materials sm
      LEFT JOIN courses c ON c.id = sm.course_id
      WHERE (sm.teacher_id = $1 OR c.teacher_id = $1)
    `
    params.push(user.id)
  } else {
    // Student: only materials from courses enrolled in
    query = `
      SELECT sm.*, c.title AS course_title, c.code AS course_code,
             COALESCE(mp.completed, false) AS completed
      FROM study_materials sm
      JOIN courses c ON c.id = sm.course_id
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
      LEFT JOIN material_progress mp ON mp.material_id = sm.id AND mp.student_id = $1
      WHERE sm.published = true
    `
    params.push(user.id)
  }

  if (courseId) {
    params.push(courseId)
    query += ` AND sm.course_id = $${params.length}`
  }

  if (subject) {
    params.push(subject)
    query += ` AND LOWER(sm.subject) = LOWER($${params.length})`
  }

  query += ` ORDER BY sm.created_at DESC`

  const result = await pool.query(query, params)
  res.json({ materials: result.rows })
}))

// POST /api/materials (Teacher only, multipart file upload)
const createMaterialSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  subject: z.string().trim().min(2).max(100),
  semester: z.string().trim().max(50).optional(),
  topic: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  content: z.string().optional(),
  format: z.string().trim().default('Document'),
  duration: z.string().trim().max(50).optional(),
  published: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
})

materialRouter.post(
  '/',
  requireRole('teacher'),
  materialUpload.single('file'),
  asyncHandler(async (req, res) => {
    const user = req.user!
    const parsed = createMaterialSchema.parse(req.body)

    // Verify course belongs to this teacher
    const courseRes = await pool.query(
      `SELECT id, title, subject FROM courses WHERE id = $1 AND teacher_id = $2`,
      [parsed.courseId, user.id],
    )
    if (courseRes.rows.length === 0) {
      throw new HttpError(403, 'You can only upload materials to your own courses.')
    }

    const file = req.file
    const fileName = file ? file.originalname : null
    const filePath = file ? file.path : null
    const fileType = file ? file.mimetype : null
    const fileSize = file ? file.size : null

    const result = await pool.query(
      `INSERT INTO study_materials
       (course_id, teacher_id, title, subject, semester, topic, description, content, format, duration, file_name, file_path, file_type, file_size, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        parsed.courseId,
        user.id,
        parsed.title,
        parsed.subject,
        parsed.semester || null,
        parsed.topic,
        parsed.description || null,
        parsed.content || null,
        parsed.format,
        parsed.duration || (file ? `${Math.ceil(file.size / 1024)} KB` : 'Reading material'),
        fileName,
        filePath,
        fileType,
        fileSize,
        parsed.published,
      ],
    )

    res.status(201).json({ material: result.rows[0] })
  }),
)

// GET /api/materials/:id
materialRouter.get('/:id', asyncHandler(async (req, res) => {
  const user = req.user!
  const materialId = req.params.id

  const result = await pool.query(
    `SELECT sm.*, c.title AS course_title, c.code AS course_code,
            COALESCE(mp.completed, false) AS completed
     FROM study_materials sm
     LEFT JOIN courses c ON c.id = sm.course_id
     LEFT JOIN material_progress mp ON mp.material_id = sm.id AND mp.student_id = $2
     WHERE sm.id = $1`,
    [materialId, user.id],
  )

  const material = result.rows[0]
  if (!material) throw new HttpError(404, 'Study material not found')

  if (user.role === 'student') {
    // Check enrollment
    const enrollRes = await pool.query(
      `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
      [material.course_id, user.id],
    )
    if (enrollRes.rows.length === 0) {
      throw new HttpError(403, 'You do not have permission to view materials for this course.')
    }
  } else if (user.role === 'teacher') {
    if (material.teacher_id !== user.id) {
      throw new HttpError(403, 'You do not have access to this study material.')
    }
  }

  res.json({ material })
}))

// GET /api/materials/:id/download (Secure file delivery)
materialRouter.get('/:id/download', asyncHandler(async (req, res) => {
  const user = req.user!
  const materialId = req.params.id

  const result = await pool.query(
    `SELECT * FROM study_materials WHERE id = $1`,
    [materialId],
  )
  const material = result.rows[0]
  if (!material) throw new HttpError(404, 'Material not found')

  // Check access permissions
  if (user.role === 'student') {
    const enrollRes = await pool.query(
      `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
      [material.course_id, user.id],
    )
    if (enrollRes.rows.length === 0) {
      throw new HttpError(403, 'Access denied. You are not enrolled in this course.')
    }
  } else if (user.role === 'teacher') {
    if (material.teacher_id !== user.id) {
      throw new HttpError(403, 'Access denied.')
    }
  }

  if (!material.file_path) {
    throw new HttpError(404, 'No file is associated with this study material.')
  }

  // Handle uploaded disk path vs static asset
  let absoluteFilePath = material.file_path
  if (!path.isAbsolute(absoluteFilePath)) {
    absoluteFilePath = path.resolve(process.cwd(), absoluteFilePath.replace(/^\//, 'public/'))
  }

  if (!fs.existsSync(absoluteFilePath)) {
    throw new HttpError(404, 'File not found on storage server.')
  }

  res.download(absoluteFilePath, material.file_name || path.basename(absoluteFilePath))
}))

// POST /api/materials/:id/progress (Student toggle completion)
materialRouter.post('/:id/progress', requireRole('student'), asyncHandler(async (req, res) => {
  const user = req.user!
  const materialId = req.params.id

  const current = await pool.query(
    `SELECT completed FROM material_progress WHERE material_id = $1 AND student_id = $2`,
    [materialId, user.id],
  )

  const isCompleted = current.rows.length > 0 && current.rows[0].completed

  if (isCompleted) {
    await pool.query(
      `DELETE FROM material_progress WHERE material_id = $1 AND student_id = $2`,
      [materialId, user.id],
    )
    res.json({ completed: false })
  } else {
    await pool.query(
      `INSERT INTO material_progress (material_id, student_id, completed)
       VALUES ($1, $2, true)
       ON CONFLICT (material_id, student_id) DO UPDATE SET completed = true`,
      [materialId, user.id],
    )
    res.json({ completed: true })
  }
}))

// DELETE /api/materials/:id (Teacher only)
materialRouter.delete('/:id', requireRole('teacher'), asyncHandler(async (req, res) => {
  const user = req.user!
  const materialId = req.params.id

  const check = await pool.query(
    `SELECT * FROM study_materials WHERE id = $1 AND teacher_id = $2`,
    [materialId, user.id],
  )
  if (check.rows.length === 0) {
    throw new HttpError(404, 'Material not found or you do not have permission to delete it.')
  }

  const mat = check.rows[0]
  if (mat.file_path && fs.existsSync(mat.file_path)) {
    try {
      fs.unlinkSync(mat.file_path)
    } catch {}
  }

  await pool.query(`DELETE FROM study_materials WHERE id = $1`, [materialId])
  res.status(204).end()
}))
