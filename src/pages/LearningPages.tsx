import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Check, FileText, Headphones, LibraryBig } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { assignments, learningMaterials, subjects } from '../data/mockLearningData'
import { learningLessons } from '../data/learningLessonContent'

function includesQuery(query: string, ...values: string[]) {
  return values.some((value) => value.toLowerCase().includes(query.toLowerCase()))
}

export function SubjectsPage() {
  const [search, setSearch] = useState('')
  const visibleSubjects = subjects.filter((subject) => includesQuery(search, subject.name, subject.description))

  return (
    <div className="feature-page">
      <PageHeader eyebrow="YOUR CLASSES" title="Subjects" description="Explore your courses and jump straight into related learning materials." />
      <div className="page-controls">
        <label htmlFor="subject-search">Find a subject</label>
        <input id="subject-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subjects" />
        <span role="status" aria-live="polite">{visibleSubjects.length} {visibleSubjects.length === 1 ? 'subject' : 'subjects'}</span>
      </div>
      <ul className="interactive-list" aria-label="Subjects">
        {visibleSubjects.map((subject) => (
          <li key={subject.id}>
            <span className="feature-list-icon" aria-hidden="true"><BookOpen size={19} /></span>
            <div className="interactive-list-copy"><h2>{subject.name}</h2><p>{subject.description}</p><span>{subject.unitCount} lessons</span></div>
            <Link className="button button-outline" to={`/materials?subject=${encodeURIComponent(subject.name)}`}>View materials <span className="visually-hidden">for {subject.name}</span></Link>
          </li>
        ))}
        {visibleSubjects.length === 0 && <li className="empty-state">No subjects match that search.</li>}
      </ul>
    </div>
  )
}

export function LearningMaterialsPage() {
  const [searchParams] = useSearchParams()
  const subject = searchParams.get('subject') ?? ''
  const [format, setFormat] = useState('All formats')
  const [search, setSearch] = useState('')
  const { completedMaterials, toggleMaterial } = useStudentWorkspace()
  const visibleMaterials = learningMaterials.filter((material) =>
    (!subject || material.subject.toLowerCase() === subject.toLowerCase()) &&
    (format === 'All formats' || material.format === format) &&
    includesQuery(search, material.title, material.subject, material.description, material.format),
  )
  const formats = [...new Set(learningMaterials.map((material) => material.format))]

  return (
    <div className="feature-page">
      <PageHeader eyebrow="YOUR LIBRARY" title="Learning Materials" description="Browse audio lessons, accessible readings, and practice activities." />
      {subject && <p className="filter-context">Showing materials for {subject}. <Link to="/materials">Clear subject filter</Link></p>}
      <div className="page-controls multi-control-row">
        <div><label htmlFor="material-search">Search materials</label><input id="material-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, subject, or format" /></div>
        <div><label htmlFor="material-format">Format</label><select id="material-format" value={format} onChange={(event) => setFormat(event.target.value)}><option>All formats</option>{formats.map((item) => <option key={item}>{item}</option>)}</select></div>
        <span role="status" aria-live="polite">{visibleMaterials.length} {visibleMaterials.length === 1 ? 'result' : 'results'}</span>
      </div>
      <ul className="interactive-list" aria-label="Learning materials">
        {visibleMaterials.map((material) => {
          const isComplete = completedMaterials.includes(material.id)
          const lesson = learningLessons[material.id]
          const isPdf = Boolean(material.fileUrl)
          const hasDetail = Boolean(lesson || isPdf)
          const Icon = material.format === 'Audio lesson' ? Headphones : isPdf ? FileText : LibraryBig
          return (
            <li key={material.id}>
              <span className="feature-list-icon" aria-hidden="true"><Icon size={19} /></span>
              <div className="interactive-list-copy">
                <h2>{hasDetail ? <Link className="lesson-title-link" to={`/materials/${material.id}`}>{material.title}</Link> : material.title}</h2>
                <p>{material.description}</p>
                <span>{material.subject} · {material.format} · {material.duration}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {isPdf && material.fileUrl && (
                  <a
                    className="button button-outline"
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${material.title} PDF directly in new tab`}
                  >
                    View PDF
                  </a>
                )}
                <button className={isComplete ? 'button button-outline is-selected' : 'button button-outline'} type="button" aria-pressed={isComplete} onClick={() => toggleMaterial(material.id)}>
                  {isComplete ? <><Check size={16} aria-hidden="true" /> Completed</> : 'Mark complete'}
                </button>
              </div>
            </li>
          )
        })}
        {visibleMaterials.length === 0 && <li className="empty-state">No materials match these filters.</li>}
      </ul>
    </div>
  )
}

type AssignmentFilter = 'All' | 'To do' | 'Completed'

export function AssignmentsPage() {
  const [filter, setFilter] = useState<AssignmentFilter>('All')
  const { completedAssignments, toggleAssignment } = useStudentWorkspace()
  const visibleAssignments = assignments.filter((assignment) => {
    const isComplete = completedAssignments.includes(assignment.id)
    return filter === 'All' || (filter === 'Completed' ? isComplete : !isComplete)
  })

  return (
    <div className="feature-page">
      <PageHeader eyebrow="YOUR WORK" title="Assignments" description="Review due dates and keep track of work you have finished." />
      <fieldset className="filter-group">
        <legend>Show assignments</legend>
        <div className="segmented-control">
          {(['All', 'To do', 'Completed'] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
      </fieldset>
      <ul className="interactive-list assignment-list" aria-label={`${filter} assignments`}>
        {visibleAssignments.map((assignment) => {
          const isComplete = completedAssignments.includes(assignment.id)
          const dueDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(assignment.dueAt))
          const isPdf = Boolean(assignment.fileUrl)
          return (
            <li key={assignment.id}>
              <span className="feature-list-icon" aria-hidden="true">
                {isComplete ? <Check size={19} /> : isPdf ? <FileText size={19} /> : <Check size={19} />}
              </span>
              <div className="interactive-list-copy">
                <h2>
                  {isPdf && assignment.fileUrl ? (
                    <a
                      href={assignment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lesson-title-link"
                      aria-label={`Open ${assignment.title} PDF in new tab`}
                    >
                      {assignment.title}
                    </a>
                  ) : (
                    assignment.title
                  )}
                </h2>
                <p>{assignment.subject} · {assignment.type}{assignment.description ? ` · ${assignment.description}` : ''}</p>
                <span><time dateTime={assignment.dueAt}>Due {dueDate}</time></span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {isPdf && assignment.fileUrl && (
                  <a
                    className="button button-outline"
                    href={assignment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View PDF for ${assignment.title} in new tab`}
                  >
                    View PDF
                  </a>
                )}
                <button
                  className={isComplete ? 'button button-outline is-selected' : 'button button-primary'}
                  type="button"
                  aria-pressed={isComplete}
                  onClick={() => toggleAssignment(assignment.id)}
                >
                  {isComplete ? 'Mark to do' : 'Mark complete'}
                </button>
              </div>
            </li>
          )
        })}
        {visibleAssignments.length === 0 && <li className="empty-state">There are no assignments in this view.</li>}
      </ul>
    </div>
  )
}