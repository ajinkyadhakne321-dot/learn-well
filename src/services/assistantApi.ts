export interface AssistantAction {
  type: 'NAVIGATE' | 'CREATE_NOTE' | 'SET_ACCESSIBILITY' | 'READ_ALOUD' | 'ANSWER_QUIZ' | 'SPEAK'
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
}

export interface AssistantApiResponse {
  spokenText: string
  action?: AssistantAction
  provider: 'gemini' | 'offline-agent'
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
}

export async function sendAssistantMessage(
  message: string,
  context: AssistantRequestContext = {}
): Promise<AssistantApiResponse> {
  const response = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
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
  supportedActions: string[]
}> {
  const res = await fetch('/api/assistant/status')
  if (!res.ok) {
    throw new Error('Failed to retrieve assistant status')
  }
  return res.json()
}
