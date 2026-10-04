import { useState, type FormEvent } from 'react'
import { Check, FileText, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { quizQuestions, subjects } from '../data/mockLearningData'
import type { StudentNote } from '../data/mockLearningData'

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
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const question = quizQuestions[questionIndex]
  const isCorrect = selectedAnswer === question.correctAnswer

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedAnswer === null) {
      setValidationMessage('Choose an answer before checking it.')
      return
    }
    if (isCorrect) setScore((current) => current + 1)
    setAnswered(true)
    setValidationMessage('')
  }

  function nextQuestion() {
    if (questionIndex === quizQuestions.length - 1) {
      setFinished(true)
      return
    }
    setQuestionIndex((current) => current + 1)
    setSelectedAnswer(null)
    setAnswered(false)
  }

  function restartQuiz() {
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setAnswered(false)
    setScore(0)
    setFinished(false)
    setValidationMessage('')
  }

  return (
    <div className="feature-page">
      <PageHeader eyebrow="PRACTICE AND REVIEW" title="Quiz" description="Try a short sample quiz. Your answers are only used in this page and are not saved." />
      <section className="quiz-panel" aria-labelledby="quiz-title">
        {finished ? (
          <div className="quiz-result" role="status" aria-live="polite"><span className="result-icon" aria-hidden="true"><Check size={23} /></span><p className="eyebrow">PRACTICE COMPLETE</p><h2 id="quiz-title">You got {score} of {quizQuestions.length} correct</h2><p>Use another try to practice these questions again.</p><button className="button button-primary" type="button" onClick={restartQuiz}><RotateCcw size={16} aria-hidden="true" /> Try again</button></div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="quiz-counter">Question {questionIndex + 1} of {quizQuestions.length}</p>
            <fieldset className="quiz-question">
              <legend id="quiz-title">{question.prompt}</legend>
              {question.answers.map((answer, index) => <label className="quiz-answer" key={answer}><input type="radio" name={`question-${questionIndex}`} value={index} checked={selectedAnswer === index} disabled={answered} onChange={() => setSelectedAnswer(index)} /><span>{answer}</span></label>)}
            </fieldset>
            {validationMessage && <p className="form-error" role="alert">{validationMessage}</p>}
            {answered && <div className={`answer-feedback ${isCorrect ? 'answer-correct' : 'answer-incorrect'}`} role="status" aria-live="polite"><strong>{isCorrect ? 'Correct.' : 'Not quite.'}</strong> {question.explanation}</div>}
            {answered ? <button className="button button-primary" type="button" onClick={nextQuestion}>{questionIndex === quizQuestions.length - 1 ? 'See results' : 'Next question'}</button> : <button className="button button-primary" type="submit">Check answer</button>}
          </form>
        )}
      </section>
    </div>
  )
}