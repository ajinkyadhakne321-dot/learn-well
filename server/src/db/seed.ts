import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

export async function seedDatabase() {
  console.info('Starting database seed...')

  // 1. Ensure default teacher account
  const teacherEmail = 'teacher@learnwell.edu'
  const teacherPasswordHash = await bcrypt.hash('TeacherSecure2026!', 12)

  let teacherRes = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
    [teacherEmail],
  )

  let teacherId: string
  if (teacherRes.rows.length === 0) {
    const insertTeacher = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'teacher')
       RETURNING id`,
      ['Prof. Eleanor Vance', teacherEmail, teacherPasswordHash],
    )
    teacherId = insertTeacher.rows[0].id
    console.info(`Created default teacher account: ${teacherEmail}`)
  } else {
    teacherId = teacherRes.rows[0].id
    // ensure teacher role
    await pool.query(`UPDATE users SET role = 'teacher' WHERE id = $1`, [teacherId])
  }

  // 2. Ensure initial courses
  const initialCourses = [
    { code: 'CS101', title: 'Python Programming Fundamentals', subject: 'python', semester: 'Fall 2026', description: 'Comprehensive coverage of core Python, loops, functions, and standard libraries.' },
    { code: 'STAT201', title: 'Applied Statistics & Probability', subject: 'statistic', semester: 'Fall 2026', description: 'Measures of central tendency, frequency distributions, and hypothesis testing.' },
    { code: 'SE301', title: 'Software Engineering Methodologies', subject: 'software engineering', semester: 'Fall 2026', description: 'SDLC processes, agile engineering, requirement elicitation, and system modeling.' },
    { code: 'AIML401', title: 'Artificial Intelligence & Machine Learning', subject: 'aiml', semester: 'Fall 2026', description: 'Supervised and unsupervised models, regression, decision trees, and neural basics.' },
    { code: 'DS202', title: 'Data Structures & Algorithms', subject: 'datastructure', semester: 'Fall 2026', description: 'Linear and non-linear data structures, algorithm complexity, trees, and graphs.' },
  ]

  const courseMap = new Map<string, string>()

  for (const c of initialCourses) {
    const existing = await pool.query(`SELECT id FROM courses WHERE code = $1`, [c.code])
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO courses (code, title, subject, semester, description, teacher_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [c.code, c.title, c.subject, c.semester, c.description, teacherId],
      )
      courseMap.set(c.code, inserted.rows[0].id)
    } else {
      courseMap.set(c.code, existing.rows[0].id)
      await pool.query(`UPDATE courses SET teacher_id = $1 WHERE id = $2`, [teacherId, existing.rows[0].id])
    }
  }

  // 3. Enroll all existing students in all initial courses
  const allStudents = await pool.query(`SELECT id FROM users WHERE role = 'student'`)
  for (const student of allStudents.rows) {
    for (const [, courseId] of courseMap) {
      await pool.query(
        `INSERT INTO course_enrollments (course_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (course_id, student_id) DO NOTHING`,
        [courseId, student.id],
      )
    }
  }

  // 4. Initial Study Materials
  const initialMaterials = [
    {
      courseCode: 'CS101',
      title: 'Python Loops & Control Structures Guide',
      subject: 'python',
      semester: 'Fall 2026',
      topic: 'Control Flow',
      description: 'Python for and while loops, control statements, nested loops, and looping utilities.',
      format: 'Accessible reading',
      duration: '6 sections',
      content: 'Comprehensive lecture notes on Python iteration paradigms. Iterables, range generators, break and continue statements, and list comprehensions.',
    },
    {
      courseCode: 'STAT201',
      title: 'Unit I: Introduction to Statistics & Frequency Distribution',
      subject: 'statistic',
      semester: 'Fall 2026',
      topic: 'Descriptive Statistics',
      description: 'Introduction to statistics concepts, definitions, scope, and foundational principles.',
      format: 'PDF document',
      duration: '28 pages',
      file_name: 'unit-1-introduction-to-statistics.pdf',
      file_path: '/materials/unit-1-introduction-to-statistics.pdf',
      file_type: 'application/pdf',
      content: 'Statistical foundations: populations vs samples, qualitative vs quantitative variables, discrete vs continuous frequency distributions.',
    },
    {
      courseCode: 'STAT201',
      title: 'Unit II: Measures of Central Tendency & Dispersion',
      subject: 'statistic',
      semester: 'Fall 2026',
      topic: 'Central Tendency',
      description: 'Detailed study of mean, median, mode, variance, and standard deviation measures.',
      format: 'PDF document',
      duration: '25 pages',
      file_name: 'unit-2-central-tendency-and-dispersion.pdf',
      file_path: '/materials/unit-2-central-tendency-and-dispersion.pdf',
      file_type: 'application/pdf',
      content: 'Formulas and properties for calculating arithmetic mean, median for grouped datasets, modal classes, variance, and standard deviation.',
    },
    {
      courseCode: 'SE301',
      title: 'Unit I: Introduction to Software Engineering',
      subject: 'software engineering',
      semester: 'Fall 2026',
      topic: 'Process Frameworks',
      description: 'Fundamentals of software engineering, evolving role of software, layered technology, process frameworks, and SDLC models.',
      format: 'PDF document',
      duration: '87 pages',
      file_name: 'se-unit-1-intro-to-software-engineering.pdf',
      file_path: '/materials/se-unit-1-intro-to-software-engineering.pdf',
      file_type: 'application/pdf',
      content: 'Overview of SDLC paradigms: Waterfall, V-Model, Spiral, Prototyping, and Agile frameworks. Quality assurance and maintenance principles.',
    },
    {
      courseCode: 'AIML401',
      title: 'Unit II: Machine Learning Techniques & Algorithms',
      subject: 'aiml',
      semester: 'Fall 2026',
      topic: 'Supervised Learning',
      description: 'Comprehensive study of supervised, unsupervised, and reinforcement learning, regression types, decision trees, bagging, and SVM.',
      format: 'PDF document',
      duration: '13 pages',
      file_name: 'aiml-unit-2-machine-learning.pdf',
      file_path: '/materials/aiml-unit-2-machine-learning.pdf',
      file_type: 'application/pdf',
      content: 'In-depth mathematical concepts of cost functions, gradient descent, linear regression, logistic regression, and SVM hyperplanes.',
    },
    {
      courseCode: 'DS202',
      title: 'Algorithmic Complexity & Asymptotic Notation',
      subject: 'datastructure',
      semester: 'Fall 2026',
      topic: 'Algorithm Analysis',
      description: 'Big-O, Omega, and Theta analysis of iterative and recursive algorithms.',
      format: 'Accessible reading',
      duration: '15 min',
      content: 'Step-by-step evaluation of time and space complexity. Amortized runtime analysis and recurrence relations using Master Theorem.',
    },
  ]

  for (const m of initialMaterials) {
    const courseId = courseMap.get(m.courseCode)
    const existing = await pool.query(
      `SELECT id FROM study_materials WHERE title = $1`,
      [m.title],
    )
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO study_materials
         (course_id, teacher_id, title, subject, semester, topic, description, content, format, duration, file_name, file_path, file_type, published)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)`,
        [courseId, teacherId, m.title, m.subject, m.semester, m.topic, m.description, m.content, m.format, m.duration, m.file_name ?? null, m.file_path ?? null, m.file_type ?? null],
      )
    }
  }

  // 5. Initial Assignments
  const initialAssignments = [
    {
      courseCode: 'CS101',
      title: 'Python Loops & Function Synthesis',
      description: 'Write a Python program that parses user logs, calculates frequency of events, and prints formatted statistics using list comprehensions.',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      points: 100,
    },
    {
      courseCode: 'STAT201',
      title: 'Central Tendency Problem Set 1',
      description: 'Calculate mean, median, mode, and standard deviation for the provided experimental dataset of 120 sensor readings.',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      points: 50,
    },
    {
      courseCode: 'SE301',
      title: 'Software Requirement Specification (SRS) Draft',
      description: 'Create an IEEE 830 compliant SRS section for an accessible educational portal, including functional requirements and accessibility criteria.',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      points: 100,
    },
  ]

  for (const a of initialAssignments) {
    const courseId = courseMap.get(a.courseCode)
    const existing = await pool.query(`SELECT id FROM assignments WHERE title = $1`, [a.title])
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO assignments (course_id, teacher_id, title, description, due_date, points, published)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [courseId, teacherId, a.title, a.description, a.due_date, a.points],
      )
    }
  }

  // 6. Initial Quizzes
  const initialQuizzes = [
    {
      courseCode: 'CS101',
      title: 'Python Control Flow & Syntax Quiz',
      description: 'Test your understanding of Python conditional branching, for-in loops, while loops, and iterators.',
      due_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      time_limit_minutes: 15,
      questions: [
        {
          prompt: 'Which Python keyword is used to skip the rest of the current iteration and proceed to the next?',
          options: ['pass', 'continue', 'break', 'return'],
          correct_answer: 1,
          explanation: 'The continue statement in Python terminates execution of the current iteration and jumps to the next loop cycle.',
        },
        {
          prompt: 'What does the range(2, 8, 2) expression evaluate to when iterated?',
          options: ['[2, 4, 6]', '[2, 4, 6, 8]', '[2, 3, 4, 5, 6, 7]', '[4, 6, 8]'],
          correct_answer: 0,
          explanation: 'range(start, stop, step) stops before reaching the stop value 8, yielding 2, 4, and 6.',
        },
        {
          prompt: 'Which loop in Python executes as long as a specified condition remains true?',
          options: ['for loop', 'while loop', 'do-while loop', 'foreach loop'],
          correct_answer: 1,
          explanation: 'A while loop evaluates a condition before each iteration and executes repeatedly while truthy.',
        },
      ],
    },
    {
      courseCode: 'STAT201',
      title: 'Measures of Dispersion Quiz',
      description: 'Test your knowledge on variance, standard deviation, and interquartile range.',
      due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      time_limit_minutes: 20,
      questions: [
        {
          prompt: 'What is the square root of variance called?',
          options: ['Mean absolute deviation', 'Standard deviation', 'Range', 'Median'],
          correct_answer: 1,
          explanation: 'Standard deviation is defined as the square root of variance, measuring spread in original data units.',
        },
        {
          prompt: 'Which measure of central tendency is least affected by extreme outlier values?',
          options: ['Arithmetic Mean', 'Median', 'Mode', 'Variance'],
          correct_answer: 1,
          explanation: 'The median depends solely on rank order, making it robust against extreme outliers.',
        },
      ],
    },
  ]

  for (const q of initialQuizzes) {
    const courseId = courseMap.get(q.courseCode)
    const existing = await pool.query(`SELECT id FROM quizzes WHERE title = $1`, [q.title])
    let quizId: string
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO quizzes (course_id, teacher_id, title, description, due_date, time_limit_minutes, published)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [courseId, teacherId, q.title, q.description, q.due_date, q.time_limit_minutes],
      )
      quizId = inserted.rows[0].id
      for (let i = 0; i < q.questions.length; i++) {
        const item = q.questions[i]
        await pool.query(
          `INSERT INTO quiz_questions (quiz_id, prompt, options, correct_answer, explanation, order_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [quizId, item.prompt, JSON.stringify(item.options), item.correct_answer, item.explanation, i],
        )
      }
    }
  }

  // 7. Initial Announcements
  const initialAnnouncements = [
    {
      courseCode: 'CS101',
      title: 'Welcome to Python Programming Fundamentals!',
      content: 'Welcome everyone! Please review the syllabus and the first study material on Control Structures. Office hours are held Wednesdays at 2 PM.',
      priority: 'high',
    },
    {
      courseCode: 'STAT201',
      title: 'Assignment 1 Released: Central Tendency Problem Set',
      content: 'Problem Set 1 is now available under Assignments. Remember to show your calculations and submit before Friday midnight.',
      priority: 'normal',
    },
    {
      courseCode: 'SE301',
      title: 'Reminder: Accessibility Workshop Next Monday',
      content: 'We will be discussing WCAG 2.2 principles and accessible software engineering next week. Bring your design drafts.',
      priority: 'normal',
    },
  ]

  for (const ann of initialAnnouncements) {
    const courseId = courseMap.get(ann.courseCode)
    const existing = await pool.query(`SELECT id FROM announcements WHERE title = $1`, [ann.title])
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO announcements (course_id, teacher_id, title, content, priority)
         VALUES ($1, $2, $3, $4, $5)`,
        [courseId, teacherId, ann.title, ann.content, ann.priority],
      )
    }
  }

  console.info('Database seed completed successfully.')
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Seed failed:', err)
      pool.end()
      process.exit(1)
    })
}
