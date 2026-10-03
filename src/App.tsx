import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAuth, RedirectAuthenticated } from './components/RequireAuth'
import { AuthProvider } from './context/AuthProvider'
import { DashboardPage } from './pages/DashboardPage'
import { FeaturePage } from './pages/FeaturePage'
import { featurePages } from './pages/featureContent'
import { StudentWorkspaceProvider } from './context/StudentWorkspaceContext'
import { AssignmentsPage, LearningMaterialsPage, SubjectsPage } from './pages/LearningPages'
import { NotesPage, QuizPage } from './pages/NotesQuizPages'
import { AccessibilitySettingsPage, CalendarPage, ProfilePage, ProgressPage } from './pages/PlannerPages'
import { AuthPage, LogoutPage } from './pages/AuthPages'
import { LearningMaterialPage } from './pages/LearningMaterialPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentWorkspaceProvider>
          <Routes>
            <Route path="login" element={<RedirectAuthenticated><AuthPage mode="login" /></RedirectAuthenticated>} />
            <Route path="register" element={<RedirectAuthenticated><AuthPage mode="register" /></RedirectAuthenticated>} />
            <Route path="logout" element={<LogoutPage />} />
            <Route element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="materials" element={<LearningMaterialsPage />} />
              <Route path="materials/:materialId" element={<LearningMaterialPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="quiz" element={<QuizPage />} />
              <Route path="assistant" element={<FeaturePage page={featurePages.assistant} />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="accessibility" element={<AccessibilitySettingsPage />} />
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
