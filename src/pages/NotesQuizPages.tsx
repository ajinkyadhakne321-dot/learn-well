import { useState, useEffect, type FormEvent } from 'react'
import { Check, FileText, Plus, RotateCcw, Trash2, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { quizQuestions, subjects } from '../data/mockLearningData'
import type { StudentNote } from '../data/mockLearningData'
import { generateAssistantQuiz } from '../services/assistantApi'
import { speakText, cancelSpeech } from '../services/speechService'

type NoteEditorProps = {
  note: StudentNote | null
  onSave: (note: StudentNote) => void
  onDelete: (id: string) => void
}

function NoteEditor({ note, onSave, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [subject, setSubject] = useState(note?.subject ?? subjects[0].name)
  const [content, setContent] = useState(note?.content ?? '')
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) {
      setMessage('Enter a title and note content before saving.')
      return
    }
    const savedNote = {
      id: note?.id ?? `note-${Date.now()}`,
      title: title.trim(),
      subject,
      content: content.trim(),
      updatedAt: new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()),
    }
    onSave(savedNote)
    setMessage(`“${savedNote.title}” saved in this preview.`)
  }

  return (
    <form className="editor-panel" onSubmit={handleSubmit}>
      <div className="section-title-row"><h2>{note ? 'Edit note' : 'New note'}</h2>{note && <button className="icon-button danger-button" type="button" aria-label={`Delete note ${note.title}`} onClick={() => onDelete(note.id)}><Trash2 size={17} aria-hidden="true" /></button>}</div>
      <label htmlFor="note-title">Title</label>
      <input id="note-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      <label htmlFor="note-subject">Subject</label>
      <select id="note-subject" value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item.id}>{item.name}</option>)}<option>Other</option></select>
      <label htmlFor="note-content">Note</label>
      <textarea id="note-content" rows={9} value={content} onChange={(event) => setContent(event.target.value)} required />
      <div className="editor-actions"><button className="button button-primary" type="submit">Save note</button><span role="status" aria-live="polite">{message}</span></div>
    </form>
  )
}

export function NotesPage() {
  const { notes, saveNote, deleteNote } = useStudentWorkspace()
  const [searchParams] = useSearchParams()
  const requestedNoteId = searchParams.get('note')
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    notes.some((note) => note.id === requestedNoteId) ? requestedNoteId : notes[0]?.id ?? null,
  )
  const [isCreating, setIsCreating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const selectedNote = notes.find((note) => note.id === selectedId) ?? null

  function handleSave(note: StudentNote) {
    saveNote(note)
    setSelectedId(note.id)
    setIsCreating(false)
    setStatusMessage(`Saved note: ${note.title}.`)
  }

  function handleDelete(id: string) {
    deleteNote(id)
    const nextNote = notes.find((note) => note.id !== id)
    setSelectedId(nextNote?.id ?? null)
    setIsCreating(!nextNote)
    setStatusMessage('Note deleted.')
  }

  return (
    <div className="feature-page">
      <PageHeader eyebrow="YOUR STUDY NOTES" title="Notes" description="Create and edit study notes. Changes stay in memory and reset when this page is refreshed." />
      <div className="notes-toolbar"><p>{notes.length} saved {notes.length === 1 ? 'note' : 'notes'}</p><button type="button" className="button button-primary" onClick={() => { setSelectedId(null); setIsCreating(true) }}><Plus size={16} aria-hidden="true" /> New note</button></div>
      <p className="visually-hidden" role="status" aria-live="polite">{statusMessage}</p>
      <div className="notes-layout">
        <nav className="notes-list" aria-label="Saved notes">
          <h2 className="visually-hidden">Saved notes</h2>
          {notes.map((note) => <button type="button" key={note.id} className={`note-choice${selectedId === note.id && !isCreating ? ' note-choice-selected' : ''}`} aria-current={selectedId === note.id && !isCreating ? 'page' : undefined} onClick={() => { setSelectedId(note.id); setIsCreating(false) }}><FileText size={17} aria-hidden="true" /><span><strong>{note.title}</strong><small>{note.subject} · {note.updatedAt}</small></span></button>)}
          {notes.length === 0 && <p className="empty-state">No saved notes yet. Create your first note.</p>}
        </nav>
        {(isCreating || selectedNote) && <NoteEditor key={isCreating ? 'new-note' : selectedNote?.id} note={isCreating ? null : selectedNote} onSave={handleSave} onDelete={handleDelete} />}
      </div>
    </div>
  )
}

export function QuizPage() {
  const { activeQuiz, setActiveQuiz } = useStudentWorkspace()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioStatus, setAudioStatus] = useState('')

  const currentQuestions = activeQuiz?.questions?.length ? activeQuiz.questions : quizQuestions
  const safeIndex = Math.min(questionIndex, currentQuestions.length - 1)
  const question = currentQuestions[safeIndex]
  const isCorrect = selectedAnswer === question.correctAnswer
  const quizTitle = activeQuiz?.title || 'Practice Quiz'

  useEffect(() => {
    return () => {
      cancelSpeech()
    }
  }, [])

  function handleSpeakQuestion() {
    if (isSpeaking) {
      cancelSpeech()
      setIsSpeaking(false)
      setAudioStatus('Speech stopped.')
      return
    }

    const promptText = `Question ${safeIndex + 1} of ${currentQuestions.length}: ${question.prompt}. ${question.answers.map((ans, i) => `Option ${i + 1}: ${ans}`).join('. ')}`
    setAudioStatus(`Reading question ${safeIndex + 1} aloud.`)
    speakText(promptText, {
      rate: 1.0,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    })
  }

  async function handleSelectSubject(subjectName: string) {
    cancelSpeech()
    setIsSpeaking(false)
    setIsGenerating(true)
    setValidationMessage('')
    try {
      const generated = await generateAssistantQuiz(subjectName)
      setActiveQuiz({
        subject: generated.subject,
        title: generated.title,
        questions: generated.questions,
      })
      setQuestionIndex(0)
      setSelectedAnswer(null)
      setAnswered(false)
      setScore(0)
      setFinished(false)
      setAudioStatus(`Loaded ${generated.title} with ${generated.questions.length} questions.`)
    } catch (error) {
      console.warn('Failed to generate quiz:', error)
      setValidationMessage('Could not generate quiz at this time. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleResetDefault() {
    cancelSpeech()
    setIsSpeaking(false)
    setActiveQuiz(null)
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswered(false)
    setScore(0)
    setFinished(false)
    setValidationMessage('')
    setAudioStatus('Reset to default sample quiz.')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedAnswer === null) {
      setValidationMessage('Choose an answer before checking it.')
      return
    }
    if (isCorrect) setScore((current) => current + 1)
    setAnswered(true)
    setValidationMessage('')

    const feedbackText = isCorrect
      ? `Correct! ${question.explanation}`
      : `Not quite. ${question.explanation}`
    speakText(feedbackText, {
      rate: 1.0,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    })
  }

  function nextQuestion() {
    cancelSpeech()
    setIsSpeaking(false)
    if (safeIndex === currentQuestions.length - 1) {
      setFinished(true)
      return
    }
    setQuestionIndex((current) => current + 1)
    setSelectedAnswer(null)
    setAnswered(false)
  }

  function restartQuiz() {
    cancelSpeech()
    setIsSpeaking(false)
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswered(false)
    setScore(0)
    setFinished(false)
    setValidationMessage('')
  }

  return (
    <div className="feature-page">
      <PageHeader
        eyebrow="AI-POWERED PRACTICE AND REVIEW"
        title={quizTitle}
        description="Test your understanding with syllabus-grounded practice questions. Choose a course topic below or ask your AI Voice Assistant anytime."
      />

      <p className="visually-hidden" role="status" aria-live="polite">
        {audioStatus}
      </p>

      {/* AI Subject Quiz Selector Bar */}
      <section className="quiz-generator-toolbar" aria-labelledby="quiz-gen-heading">
        <div className="quiz-generator-header">
          <h3 id="quiz-gen-heading">
            <Sparkles size={18} aria-hidden="true" />
            Generate Practice Quiz on Course Syllabus:
          </h3>
          {activeQuiz && (
            <button
              type="button"
              className="button button-secondary button-inline"
              onClick={handleResetDefault}
              style={{ fontSize: '13px', padding: '4px 10px' }}
            >
              Reset to sample quiz
            </button>
          )}
        </div>
        <div className="quiz-subjects-list" role="group" aria-label="Course subjects for quiz generation">
          {[
            { id: 'software engineering', label: 'Software Engineering' },
            { id: 'aiml', label: 'AI & Machine Learning' },
            { id: 'statistic', label: 'Statistics' },
            { id: 'python', label: 'Python Loops' },
            { id: 'cloud', label: 'Cloud Computing' },
          ].map((subj) => (
            <button
              key={subj.id}
              type="button"
              className={`quiz-subject-btn ${activeQuiz?.subject === subj.id ? 'active' : ''}`}
              disabled={isGenerating}
              onClick={() => handleSelectSubject(subj.id)}
            >
              {isGenerating ? 'Generating...' : subj.label}
            </button>
          ))}
        </div>
      </section>

      <section className="quiz-panel" aria-labelledby="quiz-title">
        {activeQuiz && (
          <span className="quiz-badge">
            <Sparkles size={12} aria-hidden="true" /> Syllabus Practice Quiz
          </span>
        )}

        {finished ? (
          <div className="quiz-result" role="status" aria-live="polite">
            <span className="result-icon" aria-hidden="true">
              <Check size={23} />
            </span>
            <p className="eyebrow">PRACTICE COMPLETE</p>
            <h2 id="quiz-title">
              You scored {score} of {currentQuestions.length} correct
            </h2>
            <p>
              {score === currentQuestions.length
                ? 'Outstanding work! You answered every question correctly.'
                : 'Great effort! Review the explanations above or try another topic to master your course materials.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="button button-primary" type="button" onClick={restartQuiz}>
                <RotateCcw size={16} aria-hidden="true" /> Try again
              </button>
              <button className="button button-secondary" type="button" onClick={() => handleSelectSubject('software engineering')}>
                Next topic quiz
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="quiz-header-actions">
              <p className="quiz-counter" style={{ margin: 0 }}>
                Question {safeIndex + 1} of {currentQuestions.length}
              </p>
              <button
                type="button"
                className="quiz-listen-btn"
                onClick={handleSpeakQuestion}
                aria-label={isSpeaking ? 'Stop reading question aloud' : 'Read question and options aloud'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX size={16} aria-hidden="true" /> Stop audio
                  </>
                ) : (
                  <>
                    <Volume2 size={16} aria-hidden="true" /> Listen to question
                  </>
                )}
              </button>
            </div>

            <fieldset className="quiz-question">
              <legend id="quiz-title">{question.prompt}</legend>
              {question.answers.map((answer, index) => (
                <label className="quiz-answer" key={answer}>
                  <input
                    type="radio"
                    name={`question-${safeIndex}`}
                    value={index}
                    checked={selectedAnswer === index}
                    disabled={answered}
                    onChange={() => setSelectedAnswer(index)}
                  />
                  <span>{answer}</span>
                </label>
              ))}
            </fieldset>

            {validationMessage && (
              <p className="form-error" role="alert">
                {validationMessage}
              </p>
            )}

            {answered && (
              <div
                className={`answer-feedback ${isCorrect ? 'answer-correct' : 'answer-incorrect'}`}
                role="status"
                aria-live="polite"
              >
                <strong>{isCorrect ? 'Correct.' : 'Not quite.'}</strong> {question.explanation}
              </div>
            )}

            {answered ? (
              <button className="button button-primary" type="button" onClick={nextQuestion}>
                {safeIndex === currentQuestions.length - 1 ? 'See results' : 'Next question'}
              </button>
            ) : (
              <button className="button button-primary" type="submit">
                Check answer
              </button>
            )}
          </form>
        )}
      </section>
    </div>
  )
}