import { createContext, useContext } from 'react'
import type { StudentNote } from '../data/mockLearningData'

export type AccessibilityPreferences = {
  highContrast: boolean
  textSize: 'default' | 'large' | 'extra-large'
  underlineLinks: boolean
  strongerFocus: boolean
}

export type StudentProfile = { name: string; email: string; grade: string; preferredFormat: string }

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
}

export const StudentWorkspaceContext = createContext<StudentWorkspaceValue | null>(null)

export function useStudentWorkspace() {
  const context = useContext(StudentWorkspaceContext)
  if (!context) throw new Error('useStudentWorkspace must be used inside StudentWorkspaceProvider')
  return context
}