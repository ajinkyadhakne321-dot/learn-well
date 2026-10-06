import { ArrowLeft, ArrowRight, Check, Download, ExternalLink, FileText, Square, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { learningLessons, type LessonBlock } from '../data/learningLessonContent'
import { learningMaterials } from '../data/mockLearningData'

function LessonContent({ block }: { block: LessonBlock }) {
  if (block.type === 'paragraph') return <p>{block.text}</p>
  if (block.type === 'list') return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
  return (
    <figure className="lesson-code-example">
      <figcaption>{block.label}</figcaption>
      <pre><code>{block.code}</code></pre>
    </figure>
  )
}

export function LearningMaterialPage() {
  const { materialId } = useParams()
  const { completedMaterials, toggleMaterial } = useStudentWorkspace()
  const lesson = materialId ? learningLessons[materialId] : undefined
  const material = materialId ? learningMaterials.find((item) => item.id === materialId) : undefined
  const [readingSectionId, setReadingSectionId] = useState<string | null>(null)

  function stopReading() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setReadingSectionId(null)
  }

  function toggleReadAloud(sectionId: string, title: string, blocks: LessonBlock[]) {
    if (readingSectionId === sectionId) {
      stopReading()
      return
    }

    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    setReadingSectionId(sectionId)

    const textToSpeak = `${title}. ` + blocks
      .map((b) => (b.type === 'paragraph' ? b.text : b.type === 'list' ? b.items.join('. ') : ''))
      .filter(Boolean)
      .join(' ')

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      (v) => /Google|Samantha|Daniel|Natural|Premium/i.test(v.name) && v.lang.startsWith('en')
    ) ?? voices.find((v) => v.lang.startsWith('en'))
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onend = () => setReadingSectionId(null)
    utterance.onerror = () => setReadingSectionId(null)

    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && readingSectionId) {
        stopReading()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [readingSectionId])


  if (material?.fileUrl && !lesson) {
    const isComplete = materialId ? completedMaterials.includes(materialId) : false
    return (
      <div className="feature-page lesson-page pdf-page">
        <Link className="back-link lesson-back-link" to={`/materials?subject=${encodeURIComponent(material.subject)}`}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to {material.subject} materials
        </Link>
        <PageHeader
          eyebrow={`${material.subject.toUpperCase()} · PDF DOCUMENT`}
          title={material.title}
          description={material.description}
        />
        <div className="pdf-viewer-toolbar">
          <div className="pdf-viewer-meta">
            <span className="feature-list-icon" aria-hidden="true"><FileText size={18} /></span>
            <span>{material.format} · {material.duration}</span>
          </div>
          <div className="pdf-viewer-actions">
            <a
              className="button button-outline"
              href={material.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${material.title} PDF in a new tab`}
            >
              <ExternalLink size={15} aria-hidden="true" /> Open in new tab
            </a>
            <a
              className="button button-outline"
              href={material.fileUrl}
              download
              aria-label={`Download ${material.title} PDF`}
            >
              <Download size={15} aria-hidden="true" /> Download PDF
            </a>
            <button
              type="button"
              className={isComplete ? 'button button-outline is-selected' : 'button button-outline'}
              aria-pressed={isComplete}
              onClick={() => toggleMaterial(material.id)}
            >
              {isComplete ? <><Check size={16} aria-hidden="true" /> Completed</> : 'Mark complete'}
            </button>
          </div>
        </div>

        <div className="pdf-viewer-container" aria-label={`PDF Document: ${material.title}`}>
          <object
            data={material.fileUrl}
            type="application/pdf"
            className="pdf-viewer-frame"
            aria-label={material.title}
          >
            <div className="pdf-viewer-fallback">
              <p>Your browser does not support inline PDF viewing.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                <a className="button button-primary" href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                  Open PDF in new tab
                </a>
                <a className="button button-outline" href={material.fileUrl} download>
                  Download PDF
                </a>
              </div>
            </div>
          </object>
        </div>
      </div>
    )
  }

  if (!lesson) return <Navigate to="/materials" replace />

  return (
    <div className="feature-page lesson-page">
      <Link className="back-link lesson-back-link" to={`/materials?subject=${encodeURIComponent(lesson.subject)}`}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to {lesson.subject} materials
      </Link>
      <PageHeader eyebrow={`${lesson.subject} · ACCESSIBLE READING`} title={lesson.title} description={lesson.introduction} />
      <nav className="lesson-outline" aria-label="Lesson sections">
        <h2>In this reading</h2>
        <ol>
          {lesson.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
        </ol>
      </nav>
      <article className="lesson-article" aria-label={`${lesson.title} lesson`}>
        {lesson.sections.map((section, index) => {
          const previous = lesson.sections[index - 1]
          const next = lesson.sections[index + 1]
          return (
            <section className="lesson-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <h2 id={`${section.id}-heading`} tabIndex={-1} style={{ margin: 0, paddingBottom: 0, border: 'none' }}>{section.title}</h2>
                <button
                  type="button"
                  className={`read-aloud-btn ${readingSectionId === section.id ? 'active-reading' : ''}`}
                  onClick={() => toggleReadAloud(section.id, section.title, section.blocks)}
                  aria-label={readingSectionId === section.id ? `Stop reading ${section.title} aloud` : `Read ${section.title} aloud`}
                >
                  {readingSectionId === section.id ? (
                    <>
                      <Square size={13} fill="currentColor" aria-hidden="true" />
                      <span>Stop Read Aloud</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} aria-hidden="true" />
                      <span>Read Section Aloud</span>
                    </>
                  )}
                </button>
              </div>
              {section.audioUrl && (
                <div className="lesson-audio-recording">
                  <p>Listen to this section</p>
                  <audio controls preload="metadata" aria-label={`Audio for ${section.title}`}>
                    <source src={section.audioUrl} type="audio/mpeg" />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
              <div className="lesson-section-content">
                {section.blocks.map((block, blockIndex) => <LessonContent key={`${section.id}-${blockIndex}`} block={block} />)}
              </div>
              <nav className="lesson-section-navigation" aria-label={`${section.title} navigation`}>
                {previous ? <a href={`#${previous.id}`}><ArrowLeft size={15} aria-hidden="true" /> Previous section</a> : <span />}
                {next ? <a href={`#${next.id}`}>Next section <ArrowRight size={15} aria-hidden="true" /></a> : <Link to={`/materials?subject=${encodeURIComponent(lesson.subject)}`}>Back to materials <ArrowRight size={15} aria-hidden="true" /></Link>}
              </nav>
            </section>
          )
        })}
      </article>
    </div>
  )
}
