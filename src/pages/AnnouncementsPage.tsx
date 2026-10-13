import { useEffect, useState } from 'react'
import { Megaphone, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { platformApi, type AnnouncementItem } from '../services/platformApi'

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    setLoading(true)
    setError('')
    try {
      const res = await platformApi.getAnnouncements()
      setAnnouncements(res.announcements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load course announcements.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="feature-page">
      <PageHeader
        eyebrow="COURSE NOTICES"
        title="Announcements"
        description="Important course updates, deadlines, and broadcast messages from your teachers."
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span role="status" aria-live="polite">
          {announcements.length} {announcements.length === 1 ? 'announcement' : 'announcements'}
        </span>
        <button
          type="button"
          className="button-secondary"
          onClick={loadAnnouncements}
          aria-label="Refresh announcements"
          style={{ minHeight: '34px', padding: '4px 12px' }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {loading ? (
        <p role="status">Loading announcements…</p>
      ) : announcements.length === 0 ? (
        <div className="empty-state">No announcements have been published for your courses yet.</div>
      ) : (
        <ul className="interactive-list" aria-label="Course announcements">
          {announcements.map((ann) => (
            <li key={ann.id} style={{ display: 'grid', gap: '8px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="feature-list-icon" aria-hidden="true">
                    <Megaphone size={19} />
                  </span>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{ann.title}</h2>
                </div>
                <span className={`badge-pill ${ann.priority === 'high' ? 'badge-priority-high' : 'badge-submitted'}`}>
                  {ann.priority.toUpperCase()}
                </span>
              </div>
              <p style={{ margin: '4px 0', fontSize: '13px', color: '#52635d' }}>
                Course: <strong>{ann.course_title || ann.course_code || 'General'}</strong>
                {ann.teacher_name && ` · Posted by ${ann.teacher_name}`}
                {` · ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ann.created_at))}`}
              </p>
              <p style={{ margin: '8px 0 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {ann.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
