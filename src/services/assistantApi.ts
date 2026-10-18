export type LearningMode =
  | 'Academic Learning'
  | 'Programming & Coding'
  | 'Engineering Mathematics'
  | 'Exam Preparation'
  | 'Practical & Viva'
  | 'Project Guidance'

export interface QuizQuestionItem {
  prompt: string
  answers: string[]
  correctAnswer: number
  explanation: string
}

export interface MathVerification {
  expression: string
  verified: boolean
  result: string
  steps?: string[]
  error?: string
}

export interface SourceReference {
  document_id: string
  title: string
  category: string
  page_number?: number
  branch?: string
  subject?: string
  score?: number
  snippet: string
}

export interface AssistantAction {
  type: 'NAVIGATE' | 'CREATE_NOTE' | 'SET_ACCESSIBILITY' | 'READ_ALOUD' | 'ANSWER_QUIZ' | 'SPEAK' | 'LOAD_QUIZ' | 'CLOSE'
  target?: string
  label?: string
  title?: string
  content?: string
  subject?: string
  highContrast?: boolean
  textSize?: 'default' | 'large' | 'extra-large'
  underlineLinks?: boolean
  strongerFocus?: boolean
  text?: string
  answerIndex?: number
  explanation?: string
  questions?: QuizQuestionItem[]
}

export interface AssistantApiResponse {
  response?: string
  spokenText: string
  mode?: LearningMode
  sources?: SourceReference[]
  math_verification?: MathVerification | null
  action?: AssistantAction
  conversation_id?: string
  model_used?: string
  provider: 'local-voice-agent' | 'ollama' | 'local-tutor-offline' | 'gemini' | 'offline-agent'
  error?: string | null
}

export interface AssistantRequestContext {
  currentPath?: string
  pageTitle?: string
  pageSummary?: string
  studentName?: string
  notesCount?: number
  pendingAssignmentsCount?: number
  preferences?: {
    highContrast?: boolean
    textSize?: string
    underlineLinks?: boolean
  }
  history?: Array<{
    role: 'user' | 'assistant'
    text: string
  }>
}

export interface SendAssistantMessageOptions {
  mode?: LearningMode
  branch?: string
  semester?: string
  subject?: string
  conversation_id?: string
}

export async function sendAssistantMessage(
  message: string,
  context: AssistantRequestContext = {},
  options: SendAssistantMessageOptions = {}
): Promise<AssistantApiResponse> {
  const response = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      mode: options.mode || 'Academic Learning',
      branch: options.branch,
      semester: options.semester,
      subject: options.subject,
      conversation_id: options.conversation_id,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.error || `Server responded with status ${response.status}`)
  }

  return response.json()
}

export async function fetchAssistantStatus(): Promise<{
  available: boolean
  geminiEnabled: boolean
  apiKeyRequired: boolean
  pythonAgentRunning?: boolean
  ollamaRunning?: boolean
  activeModel?: string
  modes?: string[]
  supportedActions: string[]
}> {
  const res = await fetch('/api/assistant/status')
  if (!res.ok) {
    throw new Error('Failed to retrieve assistant status')
  }
  return res.json()
}

export async function generateAssistantQuiz(subject: string): Promise<{
  subject: string
  title: string
  questions: QuizQuestionItem[]
}> {
  const response = await fetch('/api/assistant/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject }),
  })
  if (!response.ok) {
    throw new Error('Failed to generate quiz')
  }
  return response.json()
}
