import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  platformApi,
  type AssignmentItem,
  type Course,
  type NoteItem,
  type QuizItem,
  type StudentProgressSummary,
  type StudyMaterialItem,
  type SubmissionItem,
  type TeacherStats,
} from '../../services/platformApi'
import { authApi } from '../../services/authApi'

type TeacherSection =
  | 'overview'
  | 'courses'
  | 'materials'
  | 'notes'
  | 'assignments'
  | 'quizzes'
  | 'students'
  | 'announcements'
  | 'calendar'
  | 'progress'
  | 'settings'

export function TeacherDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState<TeacherSection>('overview')
  const [loading, setLoading] = useState(true)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Data states
  const [stats, setStats] = useState<TeacherStats | null>(null)
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([])
  const [studentProgress, setStudentProgress] = useState<StudentProgressSummary[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])

  // Modal & Preview states
  const [previewData, setPreviewData] = useState<{
    type: 'material' | 'assignment' | 'quiz' | 'note' | 'announcement'
    title: string
    details: any
    onConfirm: () => Promise<void>
  } | null>(null)

  // Forms states
  const [newCourse, setNewCourse] = useState({ code: '', title: '', subject: 'python', semester: 'Fall 2026', description: '' })
  const [showCourseModal, setShowCourseModal] = useState(false)

  // Material upload state
  const [materialForm, setMaterialForm] = useState({
    courseId: '',
    title: '',
    subject: 'python',
    semester: 'Fall 2026',
    topic: '',
    format: 'Document',
    duration: '',
    description: '',
    content: '',
  })
  const [materialFile, setMaterialFile] = useState<File | null>(null)

  // Note form state
  const [noteForm, setNoteForm] = useState({
    courseId: '',
    title: '',
    subject: 'python',
    content: '',
    isShared: true,
  })

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    courseId: '',
    title: '',
    description: '',
    dueDate: '',
    points: 100,
  })

  // Review Submissions modal
  const [activeReviewAssignment, setActiveReviewAssignment] = useState<AssignmentItem | null>(null)
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<SubmissionItem[]>([])
  const [gradingSubmission, setGradingSubmission] = useState<{ id: string; grade: number; feedback: string } | null>(null)

  // Quiz form state
  const [quizForm, setQuizForm] = useState({
    courseId: '',
    title: '',
    description: '',
    timeLimitMinutes: 15,
    dueDate: '',
    questions: [
      {
        prompt: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
    ],
  })
  const [aiDraftLoading, setAiDraftLoading] = useState(false)

  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    courseId: '',
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
  })

  // Settings password form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // Load dashboard data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setErrorMessage('')
    try {
      const [statsRes, coursesRes, materialsRes, assignmentsRes, quizzesRes, announcementsRes, notesRes] =
        await Promise.all([
          platformApi.getStats(),
          platformApi.getCourses(),
          platformApi.getMaterials(),
          platformApi.getAssignments(),
          platformApi.getQuizzes(),
          platformApi.getAnnouncements(),
          platformApi.getNotes(),
        ])

      if (statsRes.role === 'teacher') {
        setStats(statsRes.summary)
        setRecentSubmissions(statsRes.recentSubmissions)
        setStudentProgress(statsRes.studentProgress)
      }
      setCourses(coursesRes.courses)
      setMaterials(materialsRes.materials)
      setAssignments(assignmentsRes.assignments)
      setQuizzes(quizzesRes.quizzes)
      setAnnouncements(announcementsRes.announcements)
      setNotes(notesRes.notes)

      if (coursesRes.courses.length > 0) {
        const defaultCourse = coursesRes.courses[0].id
        setMaterialForm((prev) => ({ ...prev, courseId: prev.courseId || defaultCourse }))
        setAssignmentForm((prev) => ({ ...prev, courseId: prev.courseId || defaultCourse }))
        setQuizForm((prev) => ({ ...prev, courseId: prev.courseId || defaultCourse }))
        setAnnouncementForm((prev) => ({ ...prev, courseId: prev.courseId || defaultCourse }))
        setNoteForm((prev) => ({ ...prev, courseId: prev.courseId || defaultCourse }))
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load teacher workspace data.')
    } finally {
      setLoading(false)
    }
  }

  function showNotification(msg: string) {
    setFeedbackMessage(msg)
    setTimeout(() => setFeedbackMessage(''), 4500)
  }

  // Course creation
  async function handleCreateCourse(e: FormEvent) {
    e.preventDefault()
    try {
      const res = await platformApi.createCourse(newCourse)
      setCourses((prev) => [res.course, ...prev])
      setShowCourseModal(false)
      setNewCourse({ code: '', title: '', subject: 'python', semester: 'Fall 2026', description: '' })
      showNotification(`Course "${res.course.title}" successfully created.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not create course.')
    }
  }

  // Material upload with Preview
  function handlePreviewMaterial(e: FormEvent) {
    e.preventDefault()
    if (!materialForm.title.trim()) return

    setPreviewData({
      type: 'material',
      title: materialForm.title,
      details: { ...materialForm, fileName: materialFile?.name, fileSize: materialFile?.size },
      onConfirm: async () => {
        const formData = new FormData()
        formData.append('courseId', materialForm.courseId)
        formData.append('title', materialForm.title)
        formData.append('subject', materialForm.subject)
        formData.append('semester', materialForm.semester)
        formData.append('topic', materialForm.topic)
        formData.append('format', materialForm.format)
        formData.append('duration', materialForm.duration)
        formData.append('description', materialForm.description)
        formData.append('content', materialForm.content)
        formData.append('published', 'true')
        if (materialFile) formData.append('file', materialFile)

        const res = await platformApi.uploadMaterial(formData)
        setMaterials((prev) => [res.material, ...prev])
        setMaterialFile(null)
        setMaterialForm((prev) => ({ ...prev, title: '', topic: '', description: '', content: '' }))
        setPreviewData(null)
        showNotification('Study material published successfully!')
      },
    })
  }

  // Note creation with Preview
  function handlePreviewNote(e: FormEvent) {
    e.preventDefault()
    if (!noteForm.title.trim()) return

    setPreviewData({
      type: 'note',
      title: noteForm.title,
      details: noteForm,
      onConfirm: async () => {
        const res = await platformApi.createNote(noteForm)
        setNotes((prev) => [res.note, ...prev])
        setNoteForm((prev) => ({ ...prev, title: '', content: '' }))
        setPreviewData(null)
        showNotification('Lecture note published successfully!')
      },
    })
  }

  // Assignment creation with Preview
  function handlePreviewAssignment(e: FormEvent) {
    e.preventDefault()
    if (!assignmentForm.title.trim()) return

    setPreviewData({
      type: 'assignment',
      title: assignmentForm.title,
      details: assignmentForm,
      onConfirm: async () => {
        const res = await platformApi.createAssignment({
          ...assignmentForm,
          dueDate: assignmentForm.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        })
        setAssignments((prev) => [res.assignment, ...prev])
        setAssignmentForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }))
        setPreviewData(null)
        showNotification('Assignment published successfully!')
      },
    })
  }

  // Open Submissions review for assignment
  async function openAssignmentReview(assignment: AssignmentItem) {
    setActiveReviewAssignment(assignment)
    try {
      const res = await platformApi.getAssignment(assignment.id)
      setAssignmentSubmissions(res.submissions || [])
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load student submissions.')
    }
  }

  async function handleGradeSubmission(e: FormEvent) {
    e.preventDefault()
    if (!gradingSubmission) return
    try {
      await platformApi.gradeSubmission(gradingSubmission.id, {
        grade: gradingSubmission.grade,
        feedback: gradingSubmission.feedback,
      })
      setAssignmentSubmissions((prev) =>
        prev.map((s) =>
          s.id === gradingSubmission.id
            ? { ...s, grade: gradingSubmission.grade, feedback: gradingSubmission.feedback, status: 'graded' }
            : s,
        ),
      )
      setGradingSubmission(null)
      showNotification('Student submission graded and feedback recorded.')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not grade submission.')
    }
  }

  // AI Quiz Draft Generation
  async function handleAiDraftQuiz() {
    const selectedCourse = courses.find((c) => c.id === quizForm.courseId)
    const subject = selectedCourse?.subject || 'computer science'
    setAiDraftLoading(true)
    try {
      const draft = await platformApi.aiDraftQuiz({ subject, topic: quizForm.title || undefined })
      setQuizForm((prev) => ({
        ...prev,
        title: prev.title || draft.title,
        description: prev.description || draft.description,
        questions: draft.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctAnswer: q.correct_answer ?? 0,
          explanation: q.explanation || '',
        })),
      }))
      showNotification('AI draft questions generated! Review and customize them below before publishing.')
    } catch (err) {
      setErrorMessage('Could not generate AI quiz draft. Please enter questions manually.')
    } finally {
      setAiDraftLoading(false)
    }
  }

  // Quiz creation with Preview
  function handlePreviewQuiz(e: FormEvent) {
    e.preventDefault()
    if (!quizForm.title.trim()) return

    setPreviewData({
      type: 'quiz',
      title: quizForm.title,
      details: quizForm,
      onConfirm: async () => {
        const res = await platformApi.createQuiz({
          courseId: quizForm.courseId,
          title: quizForm.title,
          description: quizForm.description,
          timeLimitMinutes: Number(quizForm.timeLimitMinutes),
          dueDate: quizForm.dueDate || undefined,
          questions: quizForm.questions,
        })
        setQuizzes((prev) => [res.quiz, ...prev])
        setQuizForm((prev) => ({
          ...prev,
          title: '',
          description: '',
          questions: [{ prompt: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }],
        }))
        setPreviewData(null)
        showNotification('Quiz published successfully!')
      },
    })
  }

  // Announcement creation with Preview
  function handlePreviewAnnouncement(e: FormEvent) {
    e.preventDefault()
    if (!announcementForm.title.trim()) return

    setPreviewData({
      type: 'announcement',
      title: announcementForm.title,
      details: announcementForm,
      onConfirm: async () => {
        const res = await platformApi.createAnnouncement(announcementForm)
        setAnnouncements((prev) => [res.announcement, ...prev])
        setAnnouncementForm((prev) => ({ ...prev, title: '', content: '' }))
        setPreviewData(null)
        showNotification('Announcement posted successfully!')
      },
    })
  }

  // Update password
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('New passwords do not match.')
      return
    }
    try {
      const res = await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordSuccess(res.message)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not update password.')
    }
  }

  const navItems: Array<{ id: TeacherSection; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'materials', label: 'Upload Study Materials', icon: Upload },
    { id: 'notes', label: 'Manage Notes', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: FileCheck },
    { id: 'quizzes', label: 'Quizzes', icon: Award },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'progress', label: 'Student Progress', icon: CheckCircle2 },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ]

  return (
    <>
      <a className="skip-link" href="#teacher-main">Skip to main content</a>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="brand" aria-label="Learnwell Teacher Workspace">
            <span className="brand-mark" aria-hidden="true">L</span>
            <span className="brand-name">Learn<span>well</span></span>
          </div>

          <p className="nav-label">EDUCATOR WORKSPACE</p>

          <nav id="teacher-nav" className="primary-nav" aria-label="Teacher navigation">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-link${isActive ? ' nav-link-active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="sidebar-note">
            <span className="note-mark" aria-hidden="true">i</span>
            <p>
              Signed in as<br />
              <strong>{user?.name}</strong>
              <br />
              <span style={{ fontSize: '11px', color: '#185c4d' }}>{user?.email}</span>
            </p>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="workspace">
          <header className="topbar">
            <div className="topbar-context">
              <span className="context-kicker">EDUCATOR WORKSPACE</span>
              <span className="teacher-topbar-badge">
                <GraduationCap size={14} aria-hidden="true" /> Instructor Portal
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{user?.name}</span>
              <button
                type="button"
                className="button-secondary"
                style={{ minHeight: '34px', padding: '4px 10px', fontSize: '13px' }}
                onClick={() => navigate('/logout')}
                aria-label="Sign out of teacher account"
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          <main id="teacher-main" className="main-content" tabIndex={-1}>
            {/* Live Announcements and Notifications */}
            {feedbackMessage && (
              <div className="auth-success" role="status" aria-live="polite" style={{ marginBottom: '18px' }}>
                {feedbackMessage}
              </div>
            )}
            {errorMessage && (
              <div className="form-error" role="alert" aria-live="assertive" style={{ marginBottom: '18px' }}>
                {errorMessage}
              </div>
            )}

            {loading ? (
              <p role="status">Loading teacher workspace…</p>
            ) : (
              <>
                {/* 1. OVERVIEW SECTION */}
                {activeSection === 'overview' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">TEACHER DASHBOARD</p>
                        <h1>Welcome back, {user?.name}</h1>
                        <p className="welcome-copy">
                          Manage your classroom materials, evaluate submissions, and guide student learning.
                        </p>
                      </div>
                    </div>

                    <div className="stat-cards-grid" role="region" aria-label="Course summary metrics">
                      <div className="stat-card">
                        <span className="stat-card-title">My Courses</span>
                        <span className="stat-card-value">{stats?.course_count || courses.length}</span>
                        <span className="stat-card-hint">Active subjects</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-card-title">Total Students</span>
                        <span className="stat-card-value">{stats?.student_count || studentProgress.length}</span>
                        <span className="stat-card-hint">Enrolled learners</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-card-title">Study Materials</span>
                        <span className="stat-card-value">{stats?.material_count || materials.length}</span>
                        <span className="stat-card-hint">PDFs, notes, & audio</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-card-title">Pending Reviews</span>
                        <span className="stat-card-value" style={{ color: (stats?.pending_reviews || 0) > 0 ? '#b45309' : undefined }}>
                          {stats?.pending_reviews || 0}
                        </span>
                        <span className="stat-card-hint">Submissions to grade</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-card-title">Avg Quiz Score</span>
                        <span className="stat-card-value">{stats?.average_quiz_score ? `${stats.average_quiz_score}%` : 'N/A'}</span>
                        <span className="stat-card-hint">Across all quizzes</span>
                      </div>
                    </div>

                    {/* Quick Access Actions */}
                    <section className="quick-access" aria-labelledby="teacher-quick-heading">
                      <div className="section-title-row">
                        <h2 id="teacher-quick-heading">Quick actions</h2>
                      </div>
                      <div className="quick-links">
                        <button type="button" className="quick-link" onClick={() => setShowCourseModal(true)}>
                          <Plus aria-hidden="true" />
                          <span>Create new course</span>
                          <ArrowRight aria-hidden="true" />
                        </button>
                        <button type="button" className="quick-link" onClick={() => setActiveSection('materials')}>
                          <Upload aria-hidden="true" />
                          <span>Upload study material</span>
                          <ArrowRight aria-hidden="true" />
                        </button>
                        <button type="button" className="quick-link" onClick={() => setActiveSection('assignments')}>
                          <FileCheck aria-hidden="true" />
                          <span>Publish assignment</span>
                          <ArrowRight aria-hidden="true" />
                        </button>
                        <button type="button" className="quick-link" onClick={() => setActiveSection('quizzes')}>
                          <Award aria-hidden="true" />
                          <span>Create quiz with AI</span>
                          <ArrowRight aria-hidden="true" />
                        </button>
                      </div>
                    </section>

                    {/* Recent Submissions to Review */}
                    <section className="content-section" style={{ marginTop: '24px' }}>
                      <div className="section-title-row">
                        <div>
                          <p className="eyebrow">STUDENT EVALUATIONS</p>
                          <h2>Recent Submissions Needing Review</h2>
                        </div>
                        <button type="button" className="text-link" onClick={() => setActiveSection('assignments')}>
                          View all assignments <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      </div>

                      {recentSubmissions.length === 0 ? (
                        <p className="empty-state">No student submissions are currently awaiting review.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="data-table" aria-label="Submissions needing evaluation">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Assignment</th>
                                <th>Course</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentSubmissions.map((sub) => (
                                <tr key={sub.id}>
                                  <td><strong>{sub.student_name}</strong><br /><span style={{ fontSize: '12px', color: '#666' }}>{sub.student_email}</span></td>
                                  <td>{sub.assignment_title}</td>
                                  <td>{sub.course_title}</td>
                                  <td>{new Date(sub.submitted_at).toLocaleDateString()}</td>
                                  <td>
                                    <span className={`badge-pill ${sub.grade !== null ? 'badge-graded' : 'badge-submitted'}`}>
                                      {sub.grade !== null ? `Graded: ${sub.grade}` : 'Needs Review'}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="button-secondary"
                                      style={{ padding: '4px 10px', fontSize: '12px' }}
                                      onClick={() => {
                                        const asg = assignments.find((a) => a.title === sub.assignment_title)
                                        if (asg) openAssignmentReview(asg)
                                        else setActiveSection('assignments')
                                      }}
                                    >
                                      Review
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* 2. MY COURSES SECTION */}
                {activeSection === 'courses' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">COURSE MANAGEMENT</p>
                        <h1>My Courses</h1>
                        <p className="welcome-copy">View and configure courses taught by your department.</p>
                      </div>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => setShowCourseModal(true)}
                        aria-label="Create a new course"
                      >
                        <Plus size={16} aria-hidden="true" />
                        <span>Add New Course</span>
                      </button>
                    </div>

                    <div className="portal-grid" role="region" aria-label="Course list">
                      {courses.map((course) => (
                        <article key={course.id} className="portal-card" aria-labelledby={`course-heading-${course.id}`}>
                          <span className="portal-card-badge">{course.code}</span>
                          <div className="portal-card-header">
                            <h2 id={`course-heading-${course.id}`}>{course.title}</h2>
                          </div>
                          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#666' }}>
                            Subject: <strong>{course.subject}</strong> · Semester: <strong>{course.semester}</strong>
                          </p>
                          <p className="portal-card-desc">{course.description || 'No course syllabus description provided.'}</p>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#2b5043', fontWeight: 600 }}>
                            <span>{course.student_count || 0} students</span>
                            <span>{course.material_count || 0} materials</span>
                            <span>{course.assignment_count || 0} assignments</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. UPLOAD STUDY MATERIALS SECTION */}
                {activeSection === 'materials' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">CURRICULUM ASSETS</p>
                        <h1>Upload Study Materials</h1>
                        <p className="welcome-copy">
                          Upload accessible PDFs, DOCX files, reading guides, and lecture notes for students.
                        </p>
                      </div>
                    </div>

                    {/* Material Upload Form with Preview Requirement */}
                    <div className="auth-panel" style={{ width: '100%', maxWidth: '800px', marginBottom: '32px' }}>
                      <h2 style={{ margin: '0 0 14px', fontSize: '20px' }}>Add New Learning Material</h2>
                      <form className="settings-form auth-form" onSubmit={handlePreviewMaterial}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label htmlFor="material-course">Course</label>
                            <select
                              id="material-course"
                              required
                              value={materialForm.courseId}
                              onChange={(e) => setMaterialForm({ ...materialForm, courseId: e.target.value })}
                            >
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="material-subject">Subject</label>
                            <input
                              id="material-subject"
                              type="text"
                              required
                              value={materialForm.subject}
                              onChange={(e) => setMaterialForm({ ...materialForm, subject: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor="material-semester">Semester</label>
                            <input
                              id="material-semester"
                              type="text"
                              value={materialForm.semester}
                              onChange={(e) => setMaterialForm({ ...materialForm, semester: e.target.value })}
                            />
                          </div>
                          <div>
                            <label htmlFor="material-topic">Topic / Unit</label>
                            <input
                              id="material-topic"
                              type="text"
                              required
                              placeholder="e.g. Loops & Iteration"
                              value={materialForm.topic}
                              onChange={(e) => setMaterialForm({ ...materialForm, topic: e.target.value })}
                            />
                          </div>
                        </div>

                        <label htmlFor="material-title">Material Title</label>
                        <input
                          id="material-title"
                          type="text"
                          required
                          placeholder="e.g. Unit I: Complete Iteration Guide"
                          value={materialForm.title}
                          onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label htmlFor="material-format">Format</label>
                            <select
                              id="material-format"
                              value={materialForm.format}
                              onChange={(e) => setMaterialForm({ ...materialForm, format: e.target.value })}
                            >
                              <option value="Document">PDF / DOCX Document</option>
                              <option value="Accessible reading">Accessible reading</option>
                              <option value="Audio lesson">Audio lesson</option>
                              <option value="Practice set">Practice set</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor="material-duration">Duration / Size label</label>
                            <input
                              id="material-duration"
                              type="text"
                              placeholder="e.g. 15 min read or 24 pages"
                              value={materialForm.duration}
                              onChange={(e) => setMaterialForm({ ...materialForm, duration: e.target.value })}
                            />
                          </div>
                        </div>

                        <label htmlFor="material-desc">Summary & Objectives</label>
                        <textarea
                          id="material-desc"
                          rows={3}
                          value={materialForm.description}
                          onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                          placeholder="Brief description for students and screen reader overview..."
                        />

                        <label htmlFor="material-file">Upload File (PDF, DOCX, TXT, MD - Max 15MB)</label>
                        <input
                          id="material-file"
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,.md"
                          onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                        />
                        {materialFile && (
                          <p className="auth-hint">Selected: {materialFile.name} ({(materialFile.size / 1024).toFixed(1)} KB)</p>
                        )}

                        <label htmlFor="material-content">Or Direct Text / Notes Content</label>
                        <textarea
                          id="material-content"
                          rows={5}
                          value={materialForm.content}
                          onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
                          placeholder="Optional direct lecture text or accessible transcription..."
                        />

                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                          <button type="submit" className="button button-primary">
                            <Eye size={16} aria-hidden="true" />
                            <span>Preview & Publish Material</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Existing Materials Table */}
                    <div className="section-title-row">
                      <h2>Uploaded Materials ({materials.length})</h2>
                    </div>
                    <div className="table-responsive">
                      <table className="data-table" aria-label="List of uploaded learning materials">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Course</th>
                            <th>Subject & Topic</th>
                            <th>Format</th>
                            <th>File</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((m) => (
                            <tr key={m.id}>
                              <td><strong>{m.title}</strong></td>
                              <td>{m.course_code || 'General'}</td>
                              <td>{m.subject} · {m.topic}</td>
                              <td>{m.format}</td>
                              <td>{m.file_name ? <a href={`/api/materials/${m.id}/download`} download>{m.file_name}</a> : 'Text only'}</td>
                              <td>
                                <button
                                  type="button"
                                  className="icon-button"
                                  aria-label={`Delete ${m.title}`}
                                  onClick={async () => {
                                    if (confirm(`Delete "${m.title}"?`)) {
                                      await platformApi.deleteMaterial(m.id)
                                      setMaterials(materials.filter((item) => item.id !== m.id))
                                      showNotification('Material deleted.')
                                    }
                                  }}
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. MANAGE NOTES SECTION */}
                {activeSection === 'notes' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">TEACHING ASSETS</p>
                        <h1>Manage Notes</h1>
                        <p className="welcome-copy">Create, format, and share lecture notes with your enrolled students.</p>
                      </div>
                    </div>

                    <div className="auth-panel" style={{ width: '100%', maxWidth: '800px', marginBottom: '32px' }}>
                      <h2 style={{ margin: '0 0 14px', fontSize: '20px' }}>Create Lecture Note</h2>
                      <form className="settings-form auth-form" onSubmit={handlePreviewNote}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label htmlFor="note-course">Course</label>
                            <select
                              id="note-course"
                              value={noteForm.courseId}
                              onChange={(e) => setNoteForm({ ...noteForm, courseId: e.target.value })}
                            >
                              <option value="">No specific course</option>
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="note-subject">Subject</label>
                            <input
                              id="note-subject"
                              type="text"
                              value={noteForm.subject}
                              onChange={(e) => setNoteForm({ ...noteForm, subject: e.target.value })}
                            />
                          </div>
                        </div>

                        <label htmlFor="note-title">Note Title</label>
                        <input
                          id="note-title"
                          type="text"
                          required
                          placeholder="e.g. Key Takeaways: Object-Oriented Principles"
                          value={noteForm.title}
                          onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                        />

                        <label htmlFor="note-content">Lecture Content</label>
                        <textarea
                          id="note-content"
                          rows={6}
                          required
                          value={noteForm.content}
                          onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                          placeholder="Write lecture notes here. Use bullet points and clear sections for accessibility."
                        />

                        <div style={{ marginTop: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={noteForm.isShared}
                              onChange={(e) => setNoteForm({ ...noteForm, isShared: e.target.checked })}
                            />
                            <span>Share this note with enrolled students</span>
                          </label>
                        </div>

                        <button type="submit" className="button button-primary" style={{ marginTop: '14px' }}>
                          <Eye size={16} aria-hidden="true" />
                          <span>Preview & Publish Note</span>
                        </button>
                      </form>
                    </div>

                    <div className="section-title-row">
                      <h2>Your Notes ({notes.length})</h2>
                    </div>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {notes.map((n) => (
                        <div key={n.id} className="preview-box">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{n.title}</h3>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={async () => {
                                if (confirm(`Delete "${n.title}"?`)) {
                                  await platformApi.deleteNote(n.id)
                                  setNotes(notes.filter((item) => item.id !== n.id))
                                  showNotification('Note deleted.')
                                }
                              }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                          <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 10px' }}>
                            {n.subject && `Subject: ${n.subject} · `}
                            {n.is_shared ? 'Shared with students' : 'Private instructor note'}
                          </p>
                          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{n.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. ASSIGNMENTS SECTION */}
                {activeSection === 'assignments' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">COURSE WORK</p>
                        <h1>Assignments</h1>
                        <p className="welcome-copy">Publish assignments, set deadlines, and evaluate student work.</p>
                      </div>
                    </div>

                    <div className="auth-panel" style={{ width: '100%', maxWidth: '800px', marginBottom: '32px' }}>
                      <h2 style={{ margin: '0 0 14px', fontSize: '20px' }}>Create New Assignment</h2>
                      <form className="settings-form auth-form" onSubmit={handlePreviewAssignment}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label htmlFor="asg-course">Course</label>
                            <select
                              id="asg-course"
                              required
                              value={assignmentForm.courseId}
                              onChange={(e) => setAssignmentForm({ ...assignmentForm, courseId: e.target.value })}
                            >
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="asg-points">Maximum Points</label>
                            <input
                              id="asg-points"
                              type="number"
                              min={1}
                              max={1000}
                              value={assignmentForm.points}
                              onChange={(e) => setAssignmentForm({ ...assignmentForm, points: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label htmlFor="asg-date">Due Date</label>
                            <input
                              id="asg-date"
                              type="datetime-local"
                              value={assignmentForm.dueDate}
                              onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <label htmlFor="asg-title">Assignment Title</label>
                        <input
                          id="asg-title"
                          type="text"
                          required
                          placeholder="e.g. Practice Problem Set 1"
                          value={assignmentForm.title}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                        />

                        <label htmlFor="asg-desc">Instructions & Prompt</label>
                        <textarea
                          id="asg-desc"
                          rows={4}
                          required
                          value={assignmentForm.description}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                          placeholder="Provide clear assignment instructions and submission requirements..."
                        />

                        <button type="submit" className="button button-primary" style={{ marginTop: '14px' }}>
                          <Eye size={16} aria-hidden="true" />
                          <span>Preview & Publish Assignment</span>
                        </button>
                      </form>
                    </div>

                    <div className="section-title-row">
                      <h2>Active Assignments ({assignments.length})</h2>
                    </div>
                    <div className="table-responsive">
                      <table className="data-table" aria-label="Assignments list">
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>Course</th>
                            <th>Due Date</th>
                            <th>Points</th>
                            <th>Submissions</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments.map((asg) => (
                            <tr key={asg.id}>
                              <td><strong>{asg.title}</strong></td>
                              <td>{asg.course_code}</td>
                              <td>{new Date(asg.due_date).toLocaleString()}</td>
                              <td>{asg.points} pts</td>
                              <td>
                                <span className={`badge-pill ${(asg.pending_review_count || 0) > 0 ? 'badge-submitted' : 'badge-graded'}`}>
                                  {asg.submission_count || 0} total · {asg.pending_review_count || 0} pending
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="button-secondary"
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => openAssignmentReview(asg)}
                                >
                                  Review Submissions
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. QUIZZES SECTION WITH AI ASSISTANCE */}
                {activeSection === 'quizzes' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">ASSESSMENT & TESTING</p>
                        <h1>Quizzes</h1>
                        <p className="welcome-copy">
                          Design quizzes with auto-scoring, explanations, and optional AI drafting assistance.
                        </p>
                      </div>
                    </div>

                    <div className="auth-panel" style={{ width: '100%', maxWidth: '800px', marginBottom: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px' }}>Create New Quiz</h2>
                        <button
                          type="button"
                          className="button-secondary"
                          style={{ borderColor: 'var(--teal)', color: 'var(--teal)', fontWeight: 700 }}
                          disabled={aiDraftLoading}
                          onClick={handleAiDraftQuiz}
                          aria-label="Generate quiz draft using AI assistant"
                        >
                          <Sparkles size={16} aria-hidden="true" />
                          <span>{aiDraftLoading ? 'Generating draft…' : 'Generate with AI'}</span>
                        </button>
                      </div>

                      <form className="settings-form auth-form" onSubmit={handlePreviewQuiz}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label htmlFor="quiz-course">Course</label>
                            <select
                              id="quiz-course"
                              required
                              value={quizForm.courseId}
                              onChange={(e) => setQuizForm({ ...quizForm, courseId: e.target.value })}
                            >
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="quiz-limit">Time Limit (Minutes)</label>
                            <input
                              id="quiz-limit"
                              type="number"
                              min={1}
                              max={180}
                              value={quizForm.timeLimitMinutes}
                              onChange={(e) => setQuizForm({ ...quizForm, timeLimitMinutes: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label htmlFor="quiz-date">Due Date</label>
                            <input
                              id="quiz-date"
                              type="datetime-local"
                              value={quizForm.dueDate}
                              onChange={(e) => setQuizForm({ ...quizForm, dueDate: e.target.value })}
                            />
                          </div>
                        </div>

                        <label htmlFor="quiz-title">Quiz Title</label>
                        <input
                          id="quiz-title"
                          type="text"
                          required
                          placeholder="e.g. Data Structures Midterm Quiz"
                          value={quizForm.title}
                          onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                        />

                        <label htmlFor="quiz-desc">Instructions</label>
                        <textarea
                          id="quiz-desc"
                          rows={2}
                          value={quizForm.description}
                          onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                          placeholder="Instructions and rules for taking this assessment..."
                        />

                        {/* Question Builder */}
                        <div style={{ marginTop: '20px' }}>
                          <h3 style={{ fontSize: '17px', margin: '0 0 12px' }}>Quiz Questions ({quizForm.questions.length})</h3>

                          {quizForm.questions.map((q, qIndex) => (
                            <div key={qIndex} className="preview-box" style={{ background: '#fff', border: '1px solid #c8d4cc' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontWeight: 700 }}>Question {qIndex + 1} Prompt</label>
                                {quizForm.questions.length > 1 && (
                                  <button
                                    type="button"
                                    className="icon-button"
                                    onClick={() =>
                                      setQuizForm({
                                        ...quizForm,
                                        questions: quizForm.questions.filter((_, idx) => idx !== qIndex),
                                      })
                                    }
                                  >
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                required
                                value={q.prompt}
                                placeholder="Enter question prompt..."
                                onChange={(e) => {
                                  const updated = [...quizForm.questions]
                                  updated[qIndex].prompt = e.target.value
                                  setQuizForm({ ...quizForm, questions: updated })
                                }}
                              />

                              <p style={{ margin: '10px 0 6px', fontSize: '13px', fontWeight: 600 }}>Options & Correct Answer:</p>
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <input
                                    type="radio"
                                    name={`correct-${qIndex}`}
                                    checked={q.correctAnswer === optIndex}
                                    onChange={() => {
                                      const updated = [...quizForm.questions]
                                      updated[qIndex].correctAnswer = optIndex
                                      setQuizForm({ ...quizForm, questions: updated })
                                    }}
                                    aria-label={`Mark option ${optIndex + 1} as correct`}
                                  />
                                  <input
                                    type="text"
                                    required
                                    value={opt}
                                    placeholder={`Option ${optIndex + 1}`}
                                    onChange={(e) => {
                                      const updated = [...quizForm.questions]
                                      updated[qIndex].options[optIndex] = e.target.value
                                      setQuizForm({ ...quizForm, questions: updated })
                                    }}
                                    style={{ flexGrow: 1 }}
                                  />
                                </div>
                              ))}

                              <label style={{ fontSize: '13px', marginTop: '8px' }}>Explanation (shown after quiz completion):</label>
                              <input
                                type="text"
                                value={q.explanation}
                                placeholder="Explain why the chosen answer is correct..."
                                onChange={(e) => {
                                  const updated = [...quizForm.questions]
                                  updated[qIndex].explanation = e.target.value
                                  setQuizForm({ ...quizForm, questions: updated })
                                }}
                              />
                            </div>
                          ))}

                          <button
                            type="button"
                            className="button-secondary"
                            style={{ marginTop: '10px' }}
                            onClick={() =>
                              setQuizForm({
                                ...quizForm,
                                questions: [
                                  ...quizForm.questions,
                                  { prompt: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' },
                                ],
                              })
                            }
                          >
                            <Plus size={16} aria-hidden="true" />
                            <span>Add Another Question</span>
                          </button>
                        </div>

                        <button type="submit" className="button button-primary" style={{ marginTop: '20px' }}>
                          <Eye size={16} aria-hidden="true" />
                          <span>Preview & Publish Quiz</span>
                        </button>
                      </form>
                    </div>

                    <div className="section-title-row">
                      <h2>Published Quizzes ({quizzes.length})</h2>
                    </div>
                    <div className="table-responsive">
                      <table className="data-table" aria-label="Published quizzes table">
                        <thead>
                          <tr>
                            <th>Quiz Title</th>
                            <th>Course</th>
                            <th>Questions</th>
                            <th>Time Limit</th>
                            <th>Attempts</th>
                            <th>Average Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizzes.map((q) => (
                            <tr key={q.id}>
                              <td><strong>{q.title}</strong></td>
                              <td>{q.course_code}</td>
                              <td>{q.question_count || 0}</td>
                              <td>{q.time_limit_minutes} mins</td>
                              <td>{q.attempt_count || 0} attempts</td>
                              <td><strong>{q.average_score ? `${q.average_score}%` : 'N/A'}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. STUDENTS ROSTER SECTION */}
                {activeSection === 'students' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">ENROLLED LEARNERS</p>
                        <h1>Students</h1>
                        <p className="welcome-copy">Directory of students enrolled across all your assigned courses.</p>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table" aria-label="Enrolled students roster">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Email Address</th>
                            <th>Enrolled Courses</th>
                            <th>Completed Materials</th>
                            <th>Submissions</th>
                            <th>Quizzes Taken</th>
                            <th>Quiz Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentProgress.map((stu) => (
                            <tr key={stu.id}>
                              <td><strong>{stu.name}</strong></td>
                              <td>{stu.email}</td>
                              <td>{stu.enrolled_courses_count}</td>
                              <td>{stu.completed_materials_count}</td>
                              <td>{stu.total_submissions}</td>
                              <td>{stu.total_quizzes_taken}</td>
                              <td><strong>{stu.average_quiz_score ? `${stu.average_quiz_score}%` : 'N/A'}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. ANNOUNCEMENTS SECTION */}
                {activeSection === 'announcements' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">CLASS NOTICES</p>
                        <h1>Announcements</h1>
                        <p className="welcome-copy">Broadcast urgent updates and course notifications to students.</p>
                      </div>
                    </div>

                    <div className="auth-panel" style={{ width: '100%', maxWidth: '800px', marginBottom: '32px' }}>
                      <h2 style={{ margin: '0 0 14px', fontSize: '20px' }}>Post New Announcement</h2>
                      <form className="settings-form auth-form" onSubmit={handlePreviewAnnouncement}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                          <div>
                            <label htmlFor="ann-course">Course</label>
                            <select
                              id="ann-course"
                              required
                              value={announcementForm.courseId}
                              onChange={(e) => setAnnouncementForm({ ...announcementForm, courseId: e.target.value })}
                            >
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="ann-priority">Priority</label>
                            <select
                              id="ann-priority"
                              value={announcementForm.priority}
                              onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value as any })}
                            >
                              <option value="low">Low</option>
                              <option value="normal">Normal</option>
                              <option value="high">High (Urgent)</option>
                            </select>
                          </div>
                        </div>

                        <label htmlFor="ann-title">Title</label>
                        <input
                          id="ann-title"
                          type="text"
                          required
                          placeholder="e.g. Class Rescheduled or Exam Reminder"
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                        />

                        <label htmlFor="ann-content">Notice Content</label>
                        <textarea
                          id="ann-content"
                          rows={4}
                          required
                          value={announcementForm.content}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                          placeholder="Write the full announcement text..."
                        />

                        <button type="submit" className="button button-primary" style={{ marginTop: '14px' }}>
                          <Eye size={16} aria-hidden="true" />
                          <span>Preview & Publish Announcement</span>
                        </button>
                      </form>
                    </div>

                    <div className="section-title-row">
                      <h2>Published Announcements ({announcements.length})</h2>
                    </div>
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {announcements.map((ann) => (
                        <div key={ann.id} className="preview-box">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h3>{ann.title}</h3>
                              <span className={`badge-pill ${ann.priority === 'high' ? 'badge-priority-high' : 'badge-submitted'}`}>
                                {ann.priority.toUpperCase()}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={async () => {
                                if (confirm(`Delete "${ann.title}"?`)) {
                                  await platformApi.deleteAnnouncement(ann.id)
                                  setAnnouncements(announcements.filter((item) => item.id !== ann.id))
                                  showNotification('Announcement deleted.')
                                }
                              }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                          <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 10px' }}>
                            Course: {ann.course_title} · Posted {new Date(ann.created_at).toLocaleDateString()}
                          </p>
                          <p style={{ margin: 0 }}>{ann.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. CALENDAR SECTION */}
                {activeSection === 'calendar' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">COURSE TIMELINE</p>
                        <h1>Calendar & Deadlines</h1>
                        <p className="welcome-copy">Schedule of upcoming course deadlines, quiz dates, and milestones.</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div className="section-title-row">
                        <h2>Upcoming Course Deadlines</h2>
                      </div>
                      <ul className="learning-list" aria-label="Upcoming calendar items">
                        {assignments.map((asg) => (
                          <li key={asg.id} className="learning-item">
                            <span className="item-icon"><FileCheck size={19} /></span>
                            <div className="learning-details">
                              <h3>{asg.title}</h3>
                              <p>Course: {asg.course_title} · Due: {new Date(asg.due_date).toLocaleString()}</p>
                            </div>
                            <div className="learning-action">
                              <span className="badge-pill badge-submitted">Assignment</span>
                            </div>
                          </li>
                        ))}
                        {quizzes.map((q) => (
                          <li key={q.id} className="learning-item">
                            <span className="item-icon"><Award size={19} /></span>
                            <div className="learning-details">
                              <h3>{q.title}</h3>
                              <p>Course: {q.course_title} · Time limit: {q.time_limit_minutes} mins</p>
                            </div>
                            <div className="learning-action">
                              <span className="badge-pill badge-graded">Quiz</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 10. STUDENT PROGRESS SECTION */}
                {activeSection === 'progress' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">ANALYTICS & OUTCOMES</p>
                        <h1>Student Progress</h1>
                        <p className="welcome-copy">Comprehensive performance review across your courses.</p>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table" aria-label="Student progress metrics table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Enrolled Courses</th>
                            <th>Completed Materials</th>
                            <th>Assignments Submitted</th>
                            <th>Average Assignment Grade</th>
                            <th>Quizzes Completed</th>
                            <th>Quiz Average</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentProgress.map((stu) => (
                            <tr key={stu.id}>
                              <td>
                                <strong>{stu.name}</strong>
                                <br />
                                <span style={{ fontSize: '12px', color: '#666' }}>{stu.email}</span>
                              </td>
                              <td>{stu.enrolled_courses_count}</td>
                              <td>{stu.completed_materials_count}</td>
                              <td>{stu.total_submissions} ({stu.graded_submissions} graded)</td>
                              <td><strong>{stu.average_assignment_grade ? `${stu.average_assignment_grade}` : 'N/A'}</strong></td>
                              <td>{stu.total_quizzes_taken}</td>
                              <td><strong>{stu.average_quiz_score ? `${stu.average_quiz_score}%` : 'N/A'}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 11. ACCOUNT SETTINGS SECTION */}
                {activeSection === 'settings' && (
                  <div>
                    <div className="welcome-row">
                      <div>
                        <p className="eyebrow">TEACHER PROFILE</p>
                        <h1>Account Settings</h1>
                        <p className="welcome-copy">Manage your instructor credentials and password.</p>
                      </div>
                    </div>

                    <div className="auth-panel" style={{ width: '100%', maxWidth: '600px' }}>
                      <h2 style={{ margin: '0 0 14px', fontSize: '20px' }}>Change Account Password</h2>
                      {passwordSuccess && <p className="auth-success" role="status">{passwordSuccess}</p>}
                      <form className="settings-form auth-form" onSubmit={handleChangePassword}>
                        <label htmlFor="curr-pass">Current Password</label>
                        <input
                          id="curr-pass"
                          type="password"
                          required
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        />

                        <label htmlFor="new-pass">New Password (at least 12 characters)</label>
                        <input
                          id="new-pass"
                          type="password"
                          minLength={12}
                          required
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />

                        <label htmlFor="conf-pass">Confirm New Password</label>
                        <input
                          id="conf-pass"
                          type="password"
                          minLength={12}
                          required
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        />

                        <button type="submit" className="button button-primary" style={{ marginTop: '14px' }}>
                          <Save size={16} aria-hidden="true" />
                          <span>Update Password</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>

          <footer className="page-footer">
            <span>Learnwell Instructor Platform</span>
            <span>WCAG 2.2 Accessible · Verified Instructor Space</span>
          </footer>
        </div>
      </div>

      {/* CREATE COURSE MODAL */}
      {showCourseModal && (
        <div className="accessible-modal-scrim" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
          <div className="accessible-modal-content">
            <div className="accessible-modal-header">
              <h2 id="course-modal-title">Create New Course</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowCourseModal(false)}
                aria-label="Close dialog"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse}>
              <label htmlFor="c-code">Course Code (e.g. CS102)</label>
              <input
                id="c-code"
                type="text"
                required
                value={newCourse.code}
                onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
              />

              <label htmlFor="c-title">Course Title</label>
              <input
                id="c-title"
                type="text"
                required
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
              />

              <label htmlFor="c-subj">Subject</label>
              <input
                id="c-subj"
                type="text"
                required
                value={newCourse.subject}
                onChange={(e) => setNewCourse({ ...newCourse, subject: e.target.value })}
              />

              <label htmlFor="c-sem">Semester</label>
              <input
                id="c-sem"
                type="text"
                required
                value={newCourse.semester}
                onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
              />

              <label htmlFor="c-desc">Description</label>
              <textarea
                id="c-desc"
                rows={3}
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              />

              <div className="accessible-modal-footer">
                <button type="button" className="button-secondary" onClick={() => setShowCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW BEFORE PUBLISHING MODAL (Teacher preview requirement) */}
      {previewData && (
        <div
          className="accessible-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
        >
          <div className="accessible-modal-content">
            <div className="accessible-modal-header">
              <h2 id="preview-modal-title">Content Preview Before Publishing</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPreviewData(null)}
                aria-label="Cancel and close preview"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="preview-banner">
              <AlertCircle size={18} aria-hidden="true" />
              <span>Review your content carefully before making it live to all enrolled students.</span>
            </div>

            <div className="preview-box">
              <h3>{previewData.title}</h3>
              <p><strong>Item Type:</strong> {previewData.type.toUpperCase()}</p>

              {previewData.type === 'material' && (
                <>
                  <p><strong>Subject & Topic:</strong> {previewData.details.subject} · {previewData.details.topic}</p>
                  <p><strong>Format:</strong> {previewData.details.format}</p>
                  {previewData.details.fileName && <p><strong>Attached File:</strong> {previewData.details.fileName}</p>}
                  <p><strong>Description:</strong> {previewData.details.description || 'None'}</p>
                  {previewData.details.content && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#fff', border: '1px solid #ddd' }}>
                      <strong>Content Body:</strong>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{previewData.details.content}</p>
                    </div>
                  )}
                </>
              )}

              {previewData.type === 'assignment' && (
                <>
                  <p><strong>Points:</strong> {previewData.details.points} pts</p>
                  <p><strong>Due Date:</strong> {previewData.details.dueDate ? new Date(previewData.details.dueDate).toLocaleString() : 'In 7 days'}</p>
                  <p><strong>Instructions:</strong></p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{previewData.details.description}</p>
                </>
              )}

              {previewData.type === 'quiz' && (
                <>
                  <p><strong>Time Limit:</strong> {previewData.details.timeLimitMinutes} minutes</p>
                  <p><strong>Questions Count:</strong> {previewData.details.questions.length}</p>
                  <div style={{ marginTop: '10px' }}>
                    {previewData.details.questions.map((q: any, i: number) => (
                      <div key={i} style={{ marginBottom: '10px', padding: '8px', background: '#fff', border: '1px solid #eee' }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>{i + 1}. {q.prompt}</p>
                        <p style={{ margin: '4px 0', fontSize: '13px' }}>
                          Correct Answer: <strong>Option {q.correctAnswer + 1} ({q.options[q.correctAnswer]})</strong>
                        </p>
                        {q.explanation && <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Explanation: {q.explanation}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {previewData.type === 'note' && (
                <>
                  <p><strong>Course:</strong> {courses.find((c) => c.id === previewData.details.courseId)?.title || 'General'}</p>
                  <p><strong>Shared:</strong> {previewData.details.isShared ? 'Yes, visible to students' : 'Private note'}</p>
                  <div style={{ padding: '10px', background: '#fff', border: '1px solid #ddd' }}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{previewData.details.content}</p>
                  </div>
                </>
              )}

              {previewData.type === 'announcement' && (
                <>
                  <p><strong>Priority:</strong> {previewData.details.priority.toUpperCase()}</p>
                  <div style={{ padding: '10px', background: '#fff', border: '1px solid #ddd' }}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{previewData.details.content}</p>
                  </div>
                </>
              )}
            </div>

            <div className="accessible-modal-footer">
              <button type="button" className="button-secondary" onClick={() => setPreviewData(null)}>
                Edit Content
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={async () => {
                  try {
                    await previewData.onConfirm()
                  } catch (err) {
                    setErrorMessage(err instanceof Error ? err.message : 'Error publishing content.')
                  }
                }}
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW & GRADE SUBMISSIONS MODAL */}
      {activeReviewAssignment && (
        <div
          className="accessible-modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="accessible-modal-content" style={{ width: 'min(100%, 820px)' }}>
            <div className="accessible-modal-header">
              <div>
                <h2 id="review-modal-title">Submissions: {activeReviewAssignment.title}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                  Max points: {activeReviewAssignment.points} · Due {new Date(activeReviewAssignment.due_date).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setActiveReviewAssignment(null)
                  setGradingSubmission(null)
                }}
                aria-label="Close submissions review"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {gradingSubmission ? (
              <form onSubmit={handleGradeSubmission} className="preview-box">
                <h3>Grade Submission</h3>
                <label htmlFor="grade-pts">Score (out of {activeReviewAssignment.points})</label>
                <input
                  id="grade-pts"
                  type="number"
                  min={0}
                  max={activeReviewAssignment.points}
                  required
                  value={gradingSubmission.grade}
                  onChange={(e) => setGradingSubmission({ ...gradingSubmission, grade: Number(e.target.value) })}
                />

                <label htmlFor="grade-fb">Teacher Feedback</label>
                <textarea
                  id="grade-fb"
                  rows={4}
                  value={gradingSubmission.feedback}
                  onChange={(e) => setGradingSubmission({ ...gradingSubmission, feedback: e.target.value })}
                  placeholder="Provide constructive feedback for the student..."
                />

                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button type="button" className="button-secondary" onClick={() => setGradingSubmission(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary">
                    Submit Grade & Feedback
                  </button>
                </div>
              </form>
            ) : null}

            <div className="table-responsive">
              <table className="data-table" aria-label="Student submissions for assignment">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Submitted At</th>
                    <th>Response</th>
                    <th>File</th>
                    <th>Grade</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                        No students have submitted this assignment yet.
                      </td>
                    </tr>
                  ) : (
                    assignmentSubmissions.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <strong>{sub.student_name}</strong>
                          <br />
                          <span style={{ fontSize: '12px', color: '#666' }}>{sub.student_email}</span>
                        </td>
                        <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.submission_text || 'File upload only'}
                        </td>
                        <td>
                          {sub.file_name ? (
                            <a href={`/api/assignments/submissions/${sub.id}/download`} download>
                              {sub.file_name}
                            </a>
                          ) : (
                            'None'
                          )}
                        </td>
                        <td>
                          <span className={`badge-pill ${sub.grade !== null ? 'badge-graded' : 'badge-submitted'}`}>
                            {sub.grade !== null ? `${sub.grade} pts` : 'Needs Grade'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() =>
                              setGradingSubmission({
                                id: sub.id,
                                grade: sub.grade ?? 100,
                                feedback: sub.feedback || '',
                              })
                            }
                          >
                            Grade
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="accessible-modal-footer">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setActiveReviewAssignment(null)
                  setGradingSubmission(null)
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
