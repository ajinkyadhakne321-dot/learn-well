import { useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { assignments, calendarEvents, learningMaterials } from '../data/mockLearningData'
import type { AccessibilityPreferences } from '../context/StudentWorkspaceState'

export function CalendarPage() {
  const [viewedMonth, setViewedMonth] = useState(() => {
    const current = new Date()
    return new Date(current.getFullYear(), current.getMonth(), 1)
  })
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(viewedMonth)
  const monthPrefix = `${viewedMonth.getFullYear()}-${String(viewedMonth.getMonth() + 1).padStart(2, '0')}`
  const monthEvents = calendarEvents.filter((event) => event.date.startsWith(monthPrefix)).sort((first, second) => first.date.localeCompare(second.date))

  function changeMonth(offset: number) {
    setViewedMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div className="feature-page">
      <PageHeader eyebrow="YOUR SCHEDULE" title="Calendar" description="Browse upcoming learning dates by month. All entries are sample events." />
      <section className="calendar-panel" aria-labelledby="calendar-month-heading">
        <div className="calendar-heading-row">
          <h2 id="calendar-month-heading" aria-live="polite">{monthLabel}</h2>
          <div className="calendar-controls"><button className="icon-button" type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={20} aria-hidden="true" /></button><button className="icon-button" type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={20} aria-hidden="true" /></button></div>
        </div>
        {monthEvents.length ? <ol className="agenda-list" aria-label={`Events in ${monthLabel}`}>
          {monthEvents.map((event) => <li key={`${event.date}-${event.title}`}><time dateTime={event.date}><strong>{new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(`${event.date}T12:00:00`))}</strong><span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${event.date}T12:00:00`))}</span></time><div><h3>{event.title}</h3><p>{event.subject} · {event.time}</p></div></li>)}
        </ol> : <p className="empty-state calendar-empty" role="status">No scheduled sample events in {monthLabel}.</p>}
      </section>
    </div>
  )
}

export function ProgressPage() {
  const { completedMaterials, completedAssignments } = useStudentWorkspace()
  const lessonPercent = Math.round(completedMaterials.length / learningMaterials.length * 100)
  const assignmentPercent = Math.round(completedAssignments.length / assignments.length * 100)

  return (
    <div className="feature-page">
      <PageHeader eyebrow="YOUR LEARNING JOURNEY" title="Progress" description="Your progress updates as you mark sample materials and assignments complete." />
      <div className="progress-overview" aria-label="Learning progress summary">
        <section><p className="eyebrow">LESSONS</p><strong>{completedMaterials.length} of {learningMaterials.length}</strong><progress value={lessonPercent} max={100} aria-label={`Lessons completed: ${completedMaterials.length} of ${learningMaterials.length}`} /><p>{lessonPercent}% of sample lessons completed</p></section>
        <section><p className="eyebrow">ASSIGNMENTS</p><strong>{completedAssignments.length} of {assignments.length}</strong><progress value={assignmentPercent} max={100} aria-label={`Assignments completed: ${completedAssignments.length} of ${assignments.length}`} /><p>{assignmentPercent}% of sample assignments complete</p></section>
      </div>
      <section className="feature-section" aria-labelledby="progress-detail-heading"><div className="feature-section-heading"><h2 id="progress-detail-heading">Learning activity</h2><span className="sample-label">CURRENT SESSION</span></div><ul className="progress-activity-list"><li><span>Materials marked complete</span><strong>{completedMaterials.length}</strong></li><li><span>Assignments marked complete</span><strong>{completedAssignments.length}</strong></li><li><span>Study streak</span><strong>4 days <span className="visually-hidden">(sample data)</span></strong></li></ul></section>
    </div>
  )
}

export function ProfilePage() {
  const { user } = useAuth()
  const { profile, updateProfile } = useStudentWorkspace()
  const [draft, setDraft] = useState({ ...profile, name: user?.name ?? profile.name, email: user?.email ?? profile.email })
  const [saveMessage, setSaveMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateProfile(draft)
    setSaveMessage('Profile updated for this preview. Changes reset when the page is refreshed.')
  }

  return (
    <div className="feature-page">
      <PageHeader eyebrow="STUDENT DETAILS" title="Profile" description="Edit the details shown in this browser session. Sign-in credentials are managed separately." />
      <form className="settings-form" onSubmit={handleSubmit}>
        <label htmlFor="profile-name">Name</label><input id="profile-name" autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
        <label htmlFor="profile-email">Email address</label><input id="profile-email" type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required />
        <label htmlFor="profile-grade">Grade</label><select id="profile-grade" value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })}>{['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((grade) => <option key={grade}>{grade}</option>)}</select>
        <label htmlFor="preferred-format">Preferred learning format</label><select id="preferred-format" value={draft.preferredFormat} onChange={(event) => setDraft({ ...draft, preferredFormat: event.target.value })}>{['Audio and accessible text', 'Audio', 'Accessible text', 'Large print'].map((format) => <option key={format}>{format}</option>)}</select>
        <div className="editor-actions"><button className="button button-primary" type="submit"><Save size={16} aria-hidden="true" /> Save profile</button><span role="status" aria-live="polite">{saveMessage}</span></div>
      </form>
    </div>
  )
}

const preferenceLabels: { key: Exclude<keyof AccessibilityPreferences, 'textSize'>; label: string; detail: string }[] = [
  { key: 'highContrast', label: 'High contrast', detail: 'Use a stronger black, white, and dark-green contrast palette.' },
  { key: 'underlineLinks', label: 'Always underline links', detail: 'Distinguish links with underlines as well as color.' },
  { key: 'strongerFocus', label: 'Stronger keyboard focus', detail: 'Use a thicker focus outline on interactive controls.' },
]

export function AccessibilitySettingsPage() {
  const { preferences, updatePreferences } = useStudentWorkspace()

  function setPreference(key: keyof AccessibilityPreferences, value: boolean) {
    updatePreferences({ ...preferences, [key]: value })
  }

  return (
    <div className="feature-page">
      <PageHeader eyebrow="MAKE LEARNING YOURS" title="Accessibility Settings" description="Adjust visual options for this page. Settings are active immediately and reset when the page is refreshed." />
      <fieldset className="settings-options text-size-options">
        <legend>Text size</legend>
        <p className="settings-description">Choose a comfortable text size for this browser on desktop or Android.</p>
        <div className="segmented-control" aria-label="Text size">
          {([
            ['default', 'Default'],
            ['large', 'Large'],
            ['extra-large', 'Extra large'],
          ] as const).map(([size, label]) => <button key={size} type="button" aria-pressed={preferences.textSize === size} onClick={() => updatePreferences({ ...preferences, textSize: size })}>{label}</button>)}
        </div>
      </fieldset>
      <fieldset className="settings-options">
        <legend>Display and keyboard preferences</legend>
        {preferenceLabels.map(({ key, label, detail }) => <label className="setting-option" key={key}><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreference(key, event.target.checked)} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}
      </fieldset>
      <p className="settings-note"><CalendarDays size={17} aria-hidden="true" /> Your browser’s zoom and built-in screen reader remain available alongside these settings.</p>
    </div>
  )
}