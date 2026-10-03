import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { learningLessons, type LessonBlock } from '../data/learningLessonContent'

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
  const lesson = materialId ? learningLessons[materialId] : undefined

  useEffect(() => {
    if (!materialId || !lesson) return
    const activeLesson = lesson

    function saveSectionContext(sectionId: string) {
      const section = activeLesson.sections.find((item) => item.id === sectionId)
      if (!section) return
      const code = section.blocks.find((block) => block.type === 'code')

      window.localStorage.setItem('learnwell:assistant-context', JSON.stringify({
        route: `/materials/${materialId}`,
        materialId,
        sectionId: section.id,
        title: activeLesson.title,
        subject: activeLesson.subject,
        sectionTitle: section.title,
        code: code?.type === 'code' ? code.code : undefined,
        summary: activeLesson.introduction,
      }))
    }

    const initialSectionId = window.location.hash.slice(1)
    saveSectionContext(activeLesson.sections.some((section) => section.id === initialSectionId)
      ? initialSectionId
      : activeLesson.sections[0]?.id ?? '')

    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver((entries) => {
      const visibleSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0]
      const sectionId = visibleSection?.target.id
      if (sectionId) saveSectionContext(sectionId)
    }, { rootMargin: '-15% 0px -65% 0px' })

    activeLesson.sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [lesson, materialId])

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
              <h2 id={`${section.id}-heading`} tabIndex={-1}>{section.title}</h2>
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
