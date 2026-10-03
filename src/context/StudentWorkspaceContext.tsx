import { useState, type PropsWithChildren } from 'react'
import { initialNotes, type StudentNote } from '../data/mockLearningData'
import { useAuth } from './AuthContext'
import { StudentWorkspaceContext, type AccessibilityPreferences, type StudentProfile } from './StudentWorkspaceState'

export function StudentWorkspaceProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [completedMaterials, setCompletedMaterials] = useState(['material-3'])
  const [completedAssignments, setCompletedAssignments] = useState(['assignment-2'])
  const [notes, setNotes] = useState(initialNotes)
  const [profileOverride, setProfileOverride] = useState<{ userId: string | null; profile: StudentProfile } | null>(null)
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    highContrast: false,
    textSize: 'default',
    underlineLinks: false,
    strongerFocus: false,
  })

  const defaultProfile: StudentProfile = {
    name: user?.name ?? 'Alex Morgan',
    email: user?.email ?? 'alex.morgan@example.edu',
    grade: 'Grade 10',
    preferredFormat: 'Audio and accessible text',
  }
  const profile = profileOverride?.userId === (user?.id ?? null) ? profileOverride.profile : defaultProfile

  function toggleMaterial(id: string) {
    setCompletedMaterials((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function toggleAssignment(id: string) {
    setCompletedAssignments((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function saveNote(note: StudentNote) {
    setNotes((current) => current.some((item) => item.id === note.id)
      ? current.map((item) => item.id === note.id ? note : item)
      : [note, ...current])
  }

  function deleteNote(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id))
  }

  function updateProfile(nextProfile: StudentProfile) {
    setProfileOverride({ userId: user?.id ?? null, profile: nextProfile })
  }

  return (
    <StudentWorkspaceContext.Provider value={{
      completedMaterials,
      toggleMaterial,
      completedAssignments,
      toggleAssignment,
      notes,
      saveNote,
      deleteNote,
      profile,
      updateProfile,
      preferences,
      updatePreferences: setPreferences,
    }}>
      {children}
    </StudentWorkspaceContext.Provider>
  )
}
