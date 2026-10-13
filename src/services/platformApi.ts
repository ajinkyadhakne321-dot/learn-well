export type Course = {
  id: string
  code: string
  title: string
  subject: string
  semester: string
  description?: string
  teacher_id?: string
  teacher_name?: string
  teacher_email?: string
  student_count?: number
  material_count?: number
  assignment_count?: number
  quiz_count?: number
  created_at: string
}

export type StudyMaterialItem = {
  id: string
  course_id: string
  teacher_id?: string
  title: string
  subject: string
  semester?: string
  topic: string
  description?: string
  content?: string
  format: string
  duration?: string
  file_name?: string
  file_path?: string
  file_type?: string
  file_size?: number
  published: boolean
  course_title?: string
  course_code?: string
  completed?: boolean
  created_at: string
}

export type AssignmentItem = {
  id: string
  course_id: string
  teacher_id?: string
  title: string
  description: string
  due_date: string
  points: number
  published: boolean
  file_name?: string
  course_title?: string
  course_code?: string
  submission_count?: number
  pending_review_count?: number
  submission_id?: string
  submission_status?: string
  grade?: number
  feedback?: string
  submitted_at?: string
}

export type SubmissionItem = {
  id: string
  assignment_id: string
  student_id: string
  student_name?: string
  student_email?: string
  submission_text?: string
  file_name?: string
  file_path?: string
  status: string
  grade?: number
  feedback?: string
  submitted_at: string
  graded_at?: string
}

export type QuizItem = {
  id: string
  course_id: string
  teacher_id?: string
  title: string
  description?: string
  due_date?: string
  time_limit_minutes: number
  published: boolean
  course_title?: string
  course_code?: string
  question_count?: number
  attempt_count?: number
  average_score?: number
  best_score?: number
  my_attempts?: number
  created_at: string
}

export type QuizQuestionItem = {
  id: string
  quiz_id: string
  prompt: string
  options: string[]
  correct_answer?: number
  explanation?: string
  order_index: number
}

export type QuizAttemptItem = {
  id: string
  quiz_id: string
  student_id: string
  student_name?: string
  student_email?: string
  score: number
  total_questions: number
  answers: Array<{
    questionId: string
    prompt: string
    chosenOption: number
    correctOption: number
    isCorrect: boolean
    explanation?: string
  }>
  completed_at: string
}

export type AnnouncementItem = {
  id: string
  course_id: string
  teacher_id?: string
  teacher_name?: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high'
  course_title?: string
  course_code?: string
  created_at: string
}

export type NoteItem = {
  id: string
  user_id: string
  course_id?: string
  title: string
  content: string
  subject?: string
  is_shared: boolean
  course_title?: string
  course_code?: string
  author_name?: string
  is_owner?: boolean
  created_at: string
  updated_at: string
}

export type TeacherStats = {
  course_count: number
  student_count: number
  material_count: number
  assignment_count: number
  pending_reviews: number
  quiz_count: number
  average_quiz_score: number
}

export type StudentProgressSummary = {
  id: string
  name: string
  email: string
  enrolled_courses_count: number
  completed_materials_count: number
  total_submissions: number
  graded_submissions: number
  average_assignment_grade: number
  total_quizzes_taken: number
  average_quiz_score: number
}

export type StudentStats = {
  enrolled_courses: number
  total_materials: number
  completed_materials: number
  total_assignments: number
  submitted_assignments: number
  pending_assignments: number
  quizzes_taken: number
  average_quiz_score: number
  lessonProgress: number
}

export class PlatformApiError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'PlatformApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (!isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch {
    throw new PlatformApiError('Could not reach the platform service. Please check that the server is online.')
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => undefined)
  if (!response.ok) {
    const errorMsg = payload?.error ?? 'The requested operation could not be completed.'
    throw new PlatformApiError(errorMsg, response.status)
  }
  return payload as T
}

export const platformApi = {
  // Courses
  getCourses: () => request<{ courses: Course[] }>('/courses'),
  getCourse: (id: string) => request<{
    course: Course
    materials: StudyMaterialItem[]
    assignments: AssignmentItem[]
    announcements: AnnouncementItem[]
    students: any[]
  }>(`/courses/${id}`),
  createCourse: (data: { code: string; title: string; subject: string; semester: string; description?: string }) =>
    request<{ course: Course }>('/courses', { method: 'POST', body: JSON.stringify(data) }),

  // Materials
  getMaterials: (params?: { courseId?: string; subject?: string }) => {
    const query = new URLSearchParams()
    if (params?.courseId) query.set('courseId', params.courseId)
    if (params?.subject) query.set('subject', params.subject)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return request<{ materials: StudyMaterialItem[] }>(`/materials${queryString}`)
  },
  getMaterial: (id: string) => request<{ material: StudyMaterialItem }>(`/materials/${id}`),
  uploadMaterial: (formData: FormData) =>
    request<{ material: StudyMaterialItem }>('/materials', { method: 'POST', body: formData }),
  toggleMaterialProgress: (id: string) =>
    request<{ completed: boolean }>(`/materials/${id}/progress`, { method: 'POST' }),
  deleteMaterial: (id: string) => request<void>(`/materials/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: (params?: { courseId?: string }) => {
    const query = params?.courseId ? `?courseId=${params.courseId}` : ''
    return request<{ assignments: AssignmentItem[] }>(`/assignments${query}`)
  },
  getAssignment: (id: string) => request<{
    assignment: AssignmentItem
    submissions?: SubmissionItem[]
    submission?: SubmissionItem | null
  }>(`/assignments/${id}`),
  createAssignment: (data: {
    courseId: string
    title: string
    description: string
    dueDate: string
    points: number
    published?: boolean
  }) => request<{ assignment: AssignmentItem }>('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  submitAssignment: (id: string, formData: FormData) =>
    request<{ submission: SubmissionItem }>(`/assignments/${id}/submit`, { method: 'POST', body: formData }),
  gradeSubmission: (submissionId: string, data: { grade: number; feedback?: string }) =>
    request<{ submission: SubmissionItem }>(`/assignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Quizzes
  getQuizzes: (params?: { courseId?: string }) => {
    const query = params?.courseId ? `?courseId=${params.courseId}` : ''
    return request<{ quizzes: QuizItem[] }>(`/quizzes${query}`)
  },
  getQuiz: (id: string) => request<{
    quiz: QuizItem
    questions: QuizQuestionItem[]
    attempts: QuizAttemptItem[]
  }>(`/quizzes/${id}`),
  createQuiz: (data: {
    courseId: string
    title: string
    description?: string
    dueDate?: string
    timeLimitMinutes: number
    published?: boolean
    questions: Array<{
      prompt: string
      options: string[]
      correctAnswer: number
      explanation?: string
    }>
  }) => request<{ quiz: QuizItem }>('/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  submitQuiz: (id: string, answers: Record<string, number>) =>
    request<{
      attempt: QuizAttemptItem
      score: number
      correctCount: number
      totalQuestions: number
      breakdown: any[]
    }>(`/quizzes/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),

  // Announcements
  getAnnouncements: (params?: { courseId?: string }) => {
    const query = params?.courseId ? `?courseId=${params.courseId}` : ''
    return request<{ announcements: AnnouncementItem[] }>(`/announcements${query}`)
  },
  createAnnouncement: (data: { courseId: string; title: string; content: string; priority?: 'low' | 'normal' | 'high' }) =>
    request<{ announcement: AnnouncementItem }>('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) => request<void>(`/announcements/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: () => request<{ notes: NoteItem[] }>('/notes'),
  createNote: (data: { title: string; content: string; subject?: string; courseId?: string; isShared?: boolean }) =>
    request<{ note: NoteItem }>('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: Partial<{ title: string; content: string; subject?: string; courseId?: string; isShared?: boolean }>) =>
    request<{ note: NoteItem }>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id: string) => request<void>(`/notes/${id}`, { method: 'DELETE' }),

  // Teacher AI Assistant Drafts
  aiDraftQuiz: (data: { subject: string; topic?: string; count?: number }) =>
    request<{ title: string; description: string; questions: QuizQuestionItem[] }>('/teacher/ai/draft-quiz', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  aiDraftSummary: (data: { topic: string; subject: string }) =>
    request<{ draftContent: string }>('/teacher/ai/draft-summary', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  aiDraftExplanation: (data: { concept: string; subject: string }) =>
    request<{ explanation: string }>('/teacher/ai/draft-explanation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Stats
  getStats: () =>
    request<
      | { role: 'teacher'; summary: TeacherStats; recentSubmissions: any[]; studentProgress: StudentProgressSummary[] }
      | { role: 'student'; summary: StudentStats }
    >('/stats'),
}
