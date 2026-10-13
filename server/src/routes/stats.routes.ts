import { Router } from 'express'
import { pool } from '../db/pool.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth } from '../middleware/authMiddleware.js'

export const statsRouter = Router()

statsRouter.use(requireAuth)

// GET /api/stats
statsRouter.get('/', asyncHandler(async (req, res) => {
  const user = req.user!

  if (user.role === 'teacher') {
    // Teacher Overview Stats
    const countsRes = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM courses WHERE teacher_id = $1) AS course_count,
        (SELECT COUNT(DISTINCT ce.student_id)::int FROM course_enrollments ce
         JOIN courses c ON c.id = ce.course_id WHERE c.teacher_id = $1) AS student_count,
        (SELECT COUNT(*)::int FROM study_materials WHERE teacher_id = $1) AS material_count,
        (SELECT COUNT(*)::int FROM assignments WHERE teacher_id = $1) AS assignment_count,
        (SELECT COUNT(*)::int FROM assignment_submissions sub
         JOIN assignments a ON a.id = sub.assignment_id
         WHERE a.teacher_id = $1 AND sub.grade IS NULL) AS pending_reviews,
        (SELECT COUNT(*)::int FROM quizzes WHERE teacher_id = $1) AS quiz_count,
        (SELECT ROUND(COALESCE(AVG(qa.score), 0), 1) FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
         WHERE q.teacher_id = $1) AS average_quiz_score`,
      [user.id],
    )

    // Recent submissions needing review
    const recentSubmissionsRes = await pool.query(
      `SELECT sub.id, sub.submitted_at, sub.grade, sub.status,
              a.title AS assignment_title, a.points,
              c.title AS course_title,
              u.name AS student_name, u.email AS student_email
       FROM assignment_submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       JOIN courses c ON c.id = a.course_id
       JOIN users u ON u.id = sub.student_id
       WHERE a.teacher_id = $1
       ORDER BY sub.submitted_at DESC
       LIMIT 5`,
      [user.id],
    )

    // Per-student progress summary
    const studentProgressRes = await pool.query(
      `SELECT u.id, u.name, u.email,
              COUNT(DISTINCT ce.course_id)::int AS enrolled_courses_count,
              COUNT(DISTINCT mp.material_id)::int AS completed_materials_count,
              COUNT(DISTINCT sub.id)::int AS total_submissions,
              COUNT(DISTINCT CASE WHEN sub.grade IS NOT NULL THEN sub.id END)::int AS graded_submissions,
              ROUND(COALESCE(AVG(sub.grade), 0), 1) AS average_assignment_grade,
              COUNT(DISTINCT qa.id)::int AS total_quizzes_taken,
              ROUND(COALESCE(AVG(qa.score), 0), 1) AS average_quiz_score
       FROM users u
       JOIN course_enrollments ce ON ce.student_id = u.id
       JOIN courses c ON c.id = ce.course_id AND c.teacher_id = $1
       LEFT JOIN material_progress mp ON mp.student_id = u.id
       LEFT JOIN assignment_submissions sub ON sub.student_id = u.id
       LEFT JOIN quiz_attempts qa ON qa.student_id = u.id
       GROUP BY u.id, u.name, u.email
       ORDER BY u.name ASC`,
      [user.id],
    )

    return res.json({
      role: 'teacher',
      summary: countsRes.rows[0],
      recentSubmissions: recentSubmissionsRes.rows,
      studentProgress: studentProgressRes.rows,
    })
  }

  // Student Overview Stats
  const studentCountsRes = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM course_enrollments WHERE student_id = $1) AS enrolled_courses,
      (SELECT COUNT(*)::int FROM study_materials sm
       JOIN course_enrollments ce ON ce.course_id = sm.course_id
       WHERE ce.student_id = $1 AND sm.published = true) AS total_materials,
      (SELECT COUNT(*)::int FROM material_progress WHERE student_id = $1 AND completed = true) AS completed_materials,
      (SELECT COUNT(*)::int FROM assignments a
       JOIN course_enrollments ce ON ce.course_id = a.course_id
       WHERE ce.student_id = $1 AND a.published = true) AS total_assignments,
      (SELECT COUNT(*)::int FROM assignment_submissions WHERE student_id = $1) AS submitted_assignments,
      (SELECT COUNT(*)::int FROM assignments a
       JOIN course_enrollments ce ON ce.course_id = a.course_id
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = $1
       WHERE ce.student_id = $1 AND a.published = true AND sub.id IS NULL AND a.due_date > NOW()) AS pending_assignments,
      (SELECT COUNT(*)::int FROM quiz_attempts WHERE student_id = $1) AS quizzes_taken,
      (SELECT ROUND(COALESCE(AVG(score), 0), 1) FROM quiz_attempts WHERE student_id = $1) AS average_quiz_score`,
    [user.id],
  )

  const summary = studentCountsRes.rows[0]
  const totalMats = summary.total_materials || 1
  const lessonProgress = Math.min(100, Math.round(((summary.completed_materials || 0) / totalMats) * 100))

  res.json({
    role: 'student',
    summary: {
      ...summary,
      lessonProgress,
    },
  })
}))
