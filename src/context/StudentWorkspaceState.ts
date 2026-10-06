import { createContext, useContext } from 'react'
import type { StudentNote } from '../data/mockLearningData'

export type AccessibilityPreferences = {
  highContrast: boolean
  textSize: 'default' | 'large' | 'extra-large'
  underlineLinks: boolean
  strongerFocus: boolean
}

export type StudentProfile = { name: string; email: string; grade: string; preferredFormat: string }

export interface ActiveQuizState {
  subject: string
  title: string
  questions: Array<{
    prompt: string
    answers: string[]
    correctAnswer: number
    explanation: string
  }>
}

export type StudentWorkspaceValue = {
  completedMaterials: string[]
  toggleMaterial: (id: string) => void
  completedAssignments: string[]
  toggleAssignment: (id: string) => void
  notes: StudentNote[]
  saveNote: (note: StudentNote) => void
  deleteNote: (id: string) => void
  profile: StudentProfile
  updateProfile: (profile: StudentProfile) => void
  preferences: AccessibilityPreferences
  updatePreferences: (preferences: AccessibilityPreferences) => void
  activeQuiz: ActiveQuizState | null
  setActiveQuiz: (quiz: ActiveQuizState | null) => void
}

export const StudentWorkspaceContext = createContext<StudentWorkspaceValue | null>(null)

export function useStudentWorkspace() {
  const context = useContext(StudentWorkspaceContext)
  if (!context) throw new Error('useStudentWorkspace must be used inside StudentWorkspaceProvider')
  return context
}