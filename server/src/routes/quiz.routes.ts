import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { HttpError } from '../middleware/errorHandler.js'

export const quizRouter = Router()

quizRouter.use(requireAuth)

// GET /api/quizzes
quizRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!
  const { courseId } = req.query

  let query = ''
  const params: unknown[] = []

  if (user.role === 'teacher') {
    query = `
      SELECT q.*, c.title AS course_title, c.code AS course_code,
             COUNT(DISTINCT qq.id)::int AS question_count,
             COUNT(DISTINCT qa.id)::int AS attempt_count,
             ROUND(AVG(qa.score), 1) AS average_score
      FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
      WHERE (q.teacher_id = $1 OR c.teacher_id = $1)
    `
    params.push(user.id)
  } else {
    // Student
    query = `
      SELECT q.*, c.title AS course_title, c.code AS course_code,
             COUNT(DISTINCT qq.id)::int AS question_count,
             MAX(qa.score) AS best_score,
             COUNT(DISTINCT qa.id)::int AS my_attempts
      FROM quizzes q
      JOIN courses c ON c.id = q.course_id
      JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = $1
      WHERE q.published = true
    `
    params.push(user.id)
  }

  if (courseId) {
    params.push(courseId)
    query += ` AND q.course_id = $${params.length}`
  }

  query += ` GROUP BY q.id, c.title, c.code ORDER BY q.created_at DESC`

  const result = await pool.query(query, params)
  res.json({ quizzes: result.rows })
}))

const questionItemSchema = z.object({
  prompt: z.string().trim().min(3),
  options: z.array(z.string().trim().min(1)).min(2).max(6),
  correctAnswer: z.number().int().min(0),
  explanation: z.string().trim().optional(),
})

const createQuizSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  dueDate: z.string().datetime().or(z.string().min(10)).optional(),
  timeLimitMinutes: z.number().int().min(1).max(180).default(15),
  published: z.boolean().default(true),
  questions: z.array(questionItemSchema).min(1),
})

// POST /api/quizzes (Teacher only)
quizRouter.post('/', requireRole('teacher'), asyncHandler(async (req, res) => {
  const user = req.user!
  const input = createQuizSchema.parse(req.body)

  // Verify course
  const courseRes = await pool.query(
    `SELECT id FROM courses WHERE id = $1 AND teacher_id = $2`,
    [input.courseId, user.id],
  )
  if (courseRes.rows.length === 0) {
    throw new HttpError(403, 'You can only create quizzes in your own courses.')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const quizInsert = await client.query(
      `INSERT INTO quizzes (course_id, teacher_id, title, description, due_date, time_limit_minutes, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.courseId,
        user.id,
        input.title,
        input.description || null,
        input.dueDate ? new Date(input.dueDate) : null,
        input.timeLimitMinutes,
        input.published,
      ],
    )
    const quiz = quizInsert.rows[0]

    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i]
      await client.query(
        `INSERT INTO quiz_questions (quiz_id, prompt, options, correct_answer, explanation, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [quiz.id, q.prompt, JSON.stringify(q.options), q.correctAnswer, q.explanation || null, i],
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ quiz })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

// GET /api/quizzes/:id
quizRouter.get('/:id', asyncHandler(async (req, res) => {
  const user = req.user!
  const quizId = req.params.id

  const quizRes = await pool.query(
    `SELECT q.*, c.title AS course_title, c.code AS course_code, c.teacher_id AS course_teacher_id
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id
     WHERE q.id = $1`,
    [quizId],
  )
  const quiz = quizRes.rows[0]
  if (!quiz) throw new HttpError(404, 'Quiz not found')

  if (user.role === 'teacher') {
    if (quiz.course_teacher_id !== user.id && quiz.teacher_id !== user.id) {
      throw new HttpError(403, 'Access denied.')
    }

    const questionsRes = await pool.query(
      `SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC`,
      [quizId],
    )

    const attemptsRes = await pool.query(
      `SELECT qa.*, u.name AS student_name, u.email AS student_email
       FROM quiz_attempts qa
       JOIN users u ON u.id = qa.student_id
       WHERE qa.quiz_id = $1
       ORDER BY qa.completed_at DESC`,
      [quizId],
    )

    return res.json({ quiz, questions: questionsRes.rows, attempts: attemptsRes.rows })
  }

  // Student
  const enrollRes = await pool.query(
    `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
    [quiz.course_id, user.id],
  )
  if (enrollRes.rows.length === 0) {
    throw new HttpError(403, 'You are not enrolled in this course.')
  }

  const myAttemptsRes = await pool.query(
    `SELECT * FROM quiz_attempts WHERE quiz_id = $1 AND student_id = $2 ORDER BY completed_at DESC`,
    [quizId, user.id],
  )

  const hasCompleted = myAttemptsRes.rows.length > 0

  // For students taking quiz, do not reveal correct_answer until they have attempted it
  const questionsRes = await pool.query(
    `SELECT id, quiz_id, prompt, options, order_index
            ${hasCompleted ? ', correct_answer, explanation' : ''}
     FROM quiz_questions
     WHERE quiz_id = $1
     ORDER BY order_index ASC`,
    [quizId],
  )

  res.json({ quiz, questions: questionsRes.rows, attempts: myAttemptsRes.rows })
}))

const submitQuizSchema = z.object({
  answers: z.record(z.string(), z.number()), // map questionId -> selectedOptionIndex
})

// POST /api/quizzes/:id/submit (Student take quiz)
quizRouter.post('/:id/submit', requireRole('student'), asyncHandler(async (req, res) => {
  const user = req.user!
  const quizId = req.params.id
  const { answers } = submitQuizSchema.parse(req.body)

  const quizRes = await pool.query(
    `SELECT q.* FROM quizzes q
     JOIN course_enrollments ce ON ce.course_id = q.course_id AND ce.student_id = $2
     WHERE q.id = $1 AND q.published = true`,
    [quizId, user.id],
  )
  if (quizRes.rows.length === 0) {
    throw new HttpError(403, 'Quiz not found or you are not enrolled.')
  }

  const questionsRes = await pool.query<{
    id: string
    prompt: string
    options: string[]
    correct_answer: number
    explanation: string
  }>(`SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_index ASC`, [quizId])

  const questions = questionsRes.rows
  if (questions.length === 0) {
    throw new HttpError(400, 'Quiz has no questions.')
  }

  let correctCount = 0
  const breakdown = questions.map((q) => {
    const chosen = answers[q.id]
    const isCorrect = chosen === q.correct_answer
    if (isCorrect) correctCount++
    return {
      questionId: q.id,
      prompt: q.prompt,
      chosenOption: chosen,
      correctOption: q.correct_answer,
      isCorrect,
      explanation: q.explanation,
    }
  })

  const scorePercentage = Math.round((correctCount / questions.length) * 100)

  const attemptInsert = await pool.query(
    `INSERT INTO quiz_attempts (quiz_id, student_id, score, total_questions, answers, completed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [quizId, user.id, scorePercentage, questions.length, JSON.stringify(breakdown)],
  )

  res.json({
    attempt: attemptInsert.rows[0],
    score: scorePercentage,
    correctCount,
    totalQuestions: questions.length,
    breakdown,
  })
}))
