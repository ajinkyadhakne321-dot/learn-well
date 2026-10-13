import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RedirectAuthenticated, RequireAuth } from './components/RequireAuth'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { FeaturePage } from './pages/FeaturePage'
import { featurePages } from './pages/featureContent'
import { StudentWorkspaceProvider } from './context/StudentWorkspaceContext'
import { AssignmentsPage, LearningMaterialsPage, SubjectsPage } from './pages/LearningPages'
import { NotesPage, QuizPage } from './pages/NotesQuizPages'
import { AccessibilitySettingsPage, CalendarPage, ProfilePage, ProgressPage } from './pages/PlannerPages'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { AuthPage, ForgotPasswordPage, LoginSelectionPage, LogoutPage, ResetPasswordPage } from './pages/AuthPages'
import { LearningMaterialPage } from './pages/LearningMaterialPage'
import { AssistantPage } from './pages/AssistantPage'
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage'

function DashboardRoot() {
  const { user } = useAuth()
  if (user?.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />
  }
  return <DashboardPage />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentWorkspaceProvider>
          <Routes>
            {/* Public Authentication Routes */}
            <Route
              path="login"
              element={
                <RedirectAuthenticated>
                  <AuthPage mode="login" />
                </RedirectAuthenticated>
              }
            />
            <Route
              path="portal"
              element={
                <RedirectAuthenticated>
                  <LoginSelectionPage />
                </RedirectAuthenticated>
              }
            />
            <Route
              path="register"
              element={
                <RedirectAuthenticated>
                  <AuthPage mode="register" />
                </RedirectAuthenticated>
              }
            />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="logout" element={<LogoutPage />} />

            {/* Teacher Dashboard Routes (Role Protected) */}
            <Route
              path="teacher/dashboard"
              element={
                <RequireAuth allowedRoles={['teacher']}>
                  <TeacherDashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="teacher/*"
              element={<Navigate to="/teacher/dashboard" replace />}
            />

            {/* Student Dashboard Routes (Role Protected) */}
            <Route
              element={
                <RequireAuth allowedRoles={['student']}>
                  <AppShell />
                </RequireAuth>
              }
            >
              {/* Root redirects to teacher dashboard if teacher, else renders student dashboard */}
              <Route index element={<DashboardRoot />} />
              <Route path="student/dashboard" element={<DashboardPage />} />
              <Route path="assistant" element={<AssistantPage />} />
              <Route path="student/assistant" element={<AssistantPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="student/subjects" element={<SubjectsPage />} />
              <Route path="materials" element={<LearningMaterialsPage />} />
              <Route path="student/materials" element={<LearningMaterialsPage />} />
              <Route path="materials/:materialId" element={<LearningMaterialPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="student/notes" element={<NotesPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="student/assignments" element={<AssignmentsPage />} />
              <Route path="quiz" element={<QuizPage />} />
              <Route path="student/quiz" element={<QuizPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="student/calendar" element={<CalendarPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="student/announcements" element={<AnnouncementsPage />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="student/progress" element={<ProgressPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="student/profile" element={<ProfilePage />} />
              <Route path="accessibility" element={<AccessibilitySettingsPage />} />
              <Route path="student/accessibility" element={<AccessibilitySettingsPage />} />
              <Route path="help" element={<FeaturePage page={featurePages.help} />} />
              <Route path="*" element={<FeaturePage page={featurePages.notFound} />} />
            </Route>
          </Routes>
        </StudentWorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
