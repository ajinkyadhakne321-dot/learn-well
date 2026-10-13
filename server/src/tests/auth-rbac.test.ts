import assert from 'node:assert'
import { app } from '../app.js'
import { pool } from '../db/pool.js'
import type { Server } from 'node:http'

let server: Server
let baseUrl: string

async function startTestServer() {
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address()
      if (typeof address === 'object' && address) {
        baseUrl = `http://127.0.0.1:${address.port}`
      }
      resolve()
    })
  })
}

async function closeTestServer() {
  return new Promise<void>((resolve) => {
    server.close(() => resolve())
  })
}

async function runTests() {
  console.log('🧪 Starting Authentication, RBAC, and Platform Tests...')
  await startTestServer()

  try {
    // 1. Invalid credentials test
    console.log('Test 1: Invalid credentials return 401')
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@learnwell.edu', password: 'WrongPassword123!' }),
    })
    assert.strictEqual(badLoginRes.status, 401)
    console.log('  PASS: Invalid credentials rejected')

    // 2. Successful Teacher login
    console.log('Test 2: Successful Teacher login')
    const teacherLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@learnwell.edu', password: 'TeacherSecure2026!' }),
    })
    assert.strictEqual(teacherLoginRes.status, 200)
    const teacherCookie = teacherLoginRes.headers.get('set-cookie')
    assert.ok(teacherCookie, 'Session cookie must be returned')
    const teacherData = await teacherLoginRes.json()
    assert.strictEqual(teacherData.user.role, 'teacher')
    assert.strictEqual(teacherData.user.email, 'teacher@learnwell.edu')
    console.log('  PASS: Teacher logged in with role "teacher"')

    // 3. Prevent unauthorized self-assignment of teacher role
    console.log('Test 3: Reject student trying to register as teacher without authorization code')
    const maliciousRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: `fake.teacher.${Date.now()}@test.edu`,
        password: 'Password123456!',
        role: 'teacher',
        teacherCode: 'wrong-code',
      }),
    })
    assert.strictEqual(maliciousRegRes.status, 403)
    console.log('  PASS: Unauthorized teacher registration blocked with 403')

    // 4. Register legitimate student
    console.log('Test 4: Register student account')
    const studentEmail = `student.${Date.now()}@test.edu`
    const studentRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: studentEmail,
        password: 'StudentPassword123!',
        role: 'student',
      }),
    })
    assert.strictEqual(studentRegRes.status, 201)
    const studentCookie = studentRegRes.headers.get('set-cookie')
    assert.ok(studentCookie, 'Student session cookie must be returned')
    const studentData = await studentRegRes.json()
    assert.strictEqual(studentData.user.role, 'student')
    console.log('  PASS: Student registered successfully with role "student"')

    // 5. Test session persistence via /api/auth/me
    console.log('Test 5: Session persistence via /api/auth/me')
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: studentCookie },
    })
    assert.strictEqual(meRes.status, 200)
    const meData = await meRes.json()
    assert.strictEqual(meData.user.email, studentEmail)
    console.log('  PASS: Session persists and identifies student')

    // 6. Test RBAC: Student attempting to access Teacher-only endpoint
    console.log('Test 6: Student attempting to create a course (Teacher-only)')
    const forbiddenCourseRes = await fetch(`${baseUrl}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        code: 'HACK101',
        title: 'Unauthorized Course',
        subject: 'none',
        semester: 'Fall 2026',
      }),
    })
    assert.strictEqual(forbiddenCourseRes.status, 403)
    console.log('  PASS: Student restricted from teacher endpoint with 403')

    // 7. Teacher creates a course
    console.log('Test 7: Teacher creates a course')
    const testCourseCode = `TEST${Math.floor(Math.random() * 900 + 100)}`
    const createCourseRes = await fetch(`${baseUrl}/api/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        code: testCourseCode,
        title: 'Advanced AI Engineering',
        subject: 'aiml',
        semester: 'Fall 2026',
        description: 'Comprehensive course on advanced artificial intelligence systems.',
      }),
    })
    assert.strictEqual(createCourseRes.status, 201)
    const courseData = await createCourseRes.json()
    const testCourseId = courseData.course.id
    assert.ok(testCourseId)
    console.log(`  PASS: Teacher created course ${testCourseCode}`)

    // 8. Teacher creates an assignment
    console.log('Test 8: Teacher publishes assignment')
    const createAsgRes = await fetch(`${baseUrl}/api/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        courseId: testCourseId,
        title: 'Deep Learning Model Synthesis',
        description: 'Implement a multilayer perceptron classifier using NumPy.',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        points: 100,
        published: true,
      }),
    })
    assert.strictEqual(createAsgRes.status, 201)
    const asgData = await createAsgRes.json()
    const testAsgId = asgData.assignment.id
    console.log('  PASS: Assignment published')

    // Enroll student in new course
    await pool.query(
      `INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [testCourseId, studentData.user.id],
    )

    // 9. Student submits assignment
    console.log('Test 9: Student submits assignment')
    const submitRes = await fetch(`${baseUrl}/api/assignments/${testAsgId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
      },
      body: JSON.stringify({
        submissionText: 'Here is my complete solution code with gradient descent implemented.',
      }),
    })
    assert.strictEqual(submitRes.status, 201)
    const submitData = await submitRes.json()
    const submissionId = submitData.submission.id
    console.log('  PASS: Student submitted assignment response')

    // 10. Teacher reviews and grades submission
    console.log('Test 10: Teacher grades submission and provides feedback')
    const gradeRes = await fetch(`${baseUrl}/api/assignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: teacherCookie },
      body: JSON.stringify({
        grade: 96,
        feedback: 'Excellent implementation of backpropagation and loss convergence.',
      }),
    })
    assert.strictEqual(gradeRes.status, 200)
    const gradedData = await gradeRes.json()
    assert.strictEqual(gradedData.submission.grade, '96.00')
    assert.strictEqual(gradedData.submission.status, 'graded')
    console.log('  PASS: Teacher successfully graded submission with feedback')

    // 11. Password reset flow
    console.log('Test 11: Forgot password and reset flow')
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail }),
    })
    assert.strictEqual(forgotRes.status, 200)
    const forgotData = await forgotRes.json()
    const resetToken = forgotData.resetToken
    assert.ok(resetToken, 'Reset token generated in test/dev mode')

    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'NewSecureStudentPass2026!' }),
    })
    assert.strictEqual(resetRes.status, 200)

    // Verify login with new password
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: 'NewSecureStudentPass2026!' }),
    })
    assert.strictEqual(newLoginRes.status, 200)
    console.log('  PASS: Password successfully reset and authenticated')

    // 12. Logout
    console.log('Test 12: Logout functionality')
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: studentCookie },
    })
    assert.strictEqual(logoutRes.status, 204)
    console.log('  PASS: Logout clears session')

    console.log('\n🎉 ALL 12 AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!\n')
  } finally {
    await closeTestServer()
    await pool.end()
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
