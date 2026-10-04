import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  Clock3,
  FileText,
  Headphones,
  MessageCircle,
  Play,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { assignments, learningMaterials } from '../data/mockLearningData'

const activityItems = [
  { title: 'Finished “Forces and Motion” audio lesson', when: 'Yesterday · 2:14 PM', date: '2026-10-01T14:14:00', subject: 'Physics' },
  { title: 'Added notes to “The Water Cycle”', when: 'Yesterday · 11:06 AM', date: '2026-10-01T11:06:00', subject: 'Earth Science' },
  { title: 'Scored 8 out of 10 on vocabulary quiz', when: 'September 30 · 3:42 PM', date: '2026-09-30T15:42:00', subject: 'English' },
]

function matchesQuery(query: string, ...values: string[]) {
  return values.some((value) => value.toLowerCase().includes(query.toLowerCase()))
}

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const { profile, completedMaterials, toggleMaterial, completedAssignments } = useStudentWorkspace()
  const filteredLearning = learningMaterials.filter((item) => matchesQuery(query, item.title, item.subject, item.description, item.format))
  const filteredAssignments = assignments.filter((item) => matchesQuery(query, item.title, item.type, item.subject))
  const filteredActivity = activityItems.filter((item) => matchesQuery(query, item.title, item.subject))
  const dateLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const hasResults = filteredLearning.length + filteredAssignments.length + filteredActivity.length > 0
  const lessonProgress = Math.round(completedMaterials.length / learningMaterials.length * 100)

  return (
    <div className="dashboard-page">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1 tabIndex={-1}>Welcome back, {profile.name.split(' ')[0]}</h1>
          <p className="welcome-copy">Your learning plan is ready when you are.</p>
        </div>
        <div className="week-streak" aria-label="Learning streak: 4 days">
          <span className="streak-number">04</span>
          <span><strong>day streak</strong><br />You are building a habit</span>
        </div>
      </div>

      {query && (
        <p className="search-feedback" role="status" aria-live="polite">
          {hasResults ? `Showing learning results for “${query}”.` : `No learning results found for “${query}”.`}
        </p>
      )}

      <section className="quick-access" aria-labelledby="quick-access-heading">
        <div className="section-title-row">
          <div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2 id="quick-access-heading">Quick access</h2></div>
        </div>
        <div className="quick-links">
          <Link to="/subjects" className="quick-link"><BookOpen aria-hidden="true" /><span>My subjects</span><ArrowRight aria-hidden="true" /></Link>
          <Link to="/materials" className="quick-link"><Headphones aria-hidden="true" /><span>Audio materials</span><ArrowRight aria-hidden="true" /></Link>
          <Link to="/assignments" className="quick-link"><CalendarClock aria-hidden="true" /><span>Due this week</span><ArrowRight aria-hidden="true" /></Link>
          <Link to="/notes" className="quick-link"><FileText aria-hidden="true" /><span>My notes</span><ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-main-column">
          <section className="content-section" aria-labelledby="today-heading">
            <div className="section-title-row">
              <div><p className="eyebrow">YOUR PLAN</p><h2 id="today-heading">Today’s learning</h2></div>
              <Link className="text-link" to="/materials">All materials <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <ul className="learning-list">
              {filteredLearning.map((material) => {
                const isComplete = completedMaterials.includes(material.id)
                const Icon = material.format === 'Audio lesson' ? Headphones : material.format === 'Practice set' ? BookOpen : FileText
                return (
                <li className="learning-item" key={material.id}>
                  <span className="item-icon" aria-hidden="true"><Icon size={19} /></span>
                  <div className="learning-details">
                    <h3>{material.title}</h3>
                    <p>{material.subject} <span aria-hidden="true">·</span> {material.format} · {material.duration}</p>
                  </div>
                  <div className="learning-action"><span>{isComplete ? 'Completed' : 'In progress'}</span><Link to={`/materials?subject=${encodeURIComponent(material.subject)}`} aria-label={`Open ${material.title}`}>Open <Play size={14} fill="currentColor" aria-hidden="true" /></Link><button type="button" aria-pressed={isComplete} onClick={() => toggleMaterial(material.id)}>{isComplete ? 'Undo' : 'Mark complete'}</button></div>
                </li>
                )
              })}
              {filteredLearning.length === 0 && <li className="empty-state">No matching learning materials.</li>}
            </ul>
          </section>

          <section className="content-section" aria-labelledby="activity-heading">
            <div className="section-title-row">
              <div><p className="eyebrow">A LOOK BACK</p><h2 id="activity-heading">Recent activity</h2></div>
              <Link className="text-link" to="/progress">View progress <ArrowRight size={15} aria-hidden="true" /></Link>
            </div>
            <ol className="activity-list">
              {filteredActivity.map((activity) => (
                <li className="activity-item" key={activity.title}>
                  <span className="activity-check" aria-hidden="true"><Check size={15} /></span>
                  <div><h3>{activity.title}</h3><p>{activity.subject} <span aria-hidden="true">·</span> <time dateTime={activity.date}>{activity.when}</time></p></div>
                </li>
              ))}
              {filteredActivity.length === 0 && <li className="empty-state">No matching recent activity.</li>}
            </ol>
          </section>
        </div>

        <aside className="dashboard-side-column" aria-label="Upcoming work and progress">
          <section className="content-section upcoming-section" aria-labelledby="upcoming-heading">
            <div className="section-title-row">
              <div><p className="eyebrow">PLAN AHEAD</p><h2 id="upcoming-heading">Coming up</h2></div>
              <Link className="icon-link" to="/calendar" aria-label="Open calendar"><CalendarClock size={18} aria-hidden="true" /></Link>
            </div>
            <ul className="upcoming-list">
              {filteredAssignments.map((assignment) => (
                <li className="upcoming-item" key={assignment.id}>
                  <span className="item-icon small-icon" aria-hidden="true">{assignment.type === 'Quiz' ? <Check size={17} /> : <FileText size={17} />}</span>
                  <div><span className="item-type">{completedAssignments.includes(assignment.id) ? 'Completed' : assignment.type}</span><h3>{assignment.title}</h3><p><Clock3 size={13} aria-hidden="true" /><time dateTime={assignment.dueAt}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(assignment.dueAt))}</time></p></div>
                </li>
              ))}
              {filteredAssignments.length === 0 && <li className="empty-state">No matching upcoming work.</li>}
            </ul>
            <Link className="text-link list-footer-link" to="/assignments">All assignments <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>

          <section className="content-section progress-section" aria-labelledby="progress-heading">
            <div className="section-title-row">
              <div><p className="eyebrow">STEADY PROGRESS</p><h2 id="progress-heading">Your progress</h2></div>
              <Link className="icon-link" to="/progress" aria-label="View all progress"><ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="progress-summary"><strong>{lessonProgress}%</strong><span>sample lessons completed</span></div>
            <progress value={lessonProgress} max={100} aria-label={`Overall course progress: ${lessonProgress} percent`}>{lessonProgress}%</progress>
            <dl className="progress-details">
              <div><dt>Lessons completed</dt><dd>24 of 35</dd></div>
              <div><dt>Practice sessions</dt><dd>12 this month</dd></div>
            </dl>
            <Link className="text-link" to="/progress">See detailed progress <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>

          <section className="support-note" aria-labelledby="support-heading">
            <MessageCircle size={18} aria-hidden="true" />
            <div><h2 id="support-heading">Need a hand?</h2><p>Find answers or contact student support.</p><Link to="/help">Visit help center <ArrowRight size={14} aria-hidden="true" /></Link></div>
          </section>
        </aside>
      </div>
    </div>
  )
}