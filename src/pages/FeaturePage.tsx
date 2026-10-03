import { ArrowRight, BookOpen, BrainCircuit, CircleHelp, FileText, Mic, SendHorizonal, Sparkles, Volume2 } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { learningLessons, type LearningLessonSection } from '../data/learningLessonContent'
import { assignments, calendarEvents, learningMaterials } from '../data/mockLearningData'

export type FeaturePageContent = {
  title: string
  eyebrow: string
  description: string
  items: { title: string; detail: string; meta: string }[]
}

type FeaturePageProps = { page: FeaturePageContent }

type AssistantContext = {
  route: string
  materialId?: string
  sectionId?: string
  title?: string
  subject?: string
  noteId?: string
  noteTitle?: string
  code?: string
  sectionTitle?: string
  summary?: string
}

type AssistantMessage = { role: 'assistant' | 'user'; text: string }
type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking'

type SpeechRecognitionAlternativeLike = { transcript: string }
type SpeechRecognitionResultLike = {
  isFinal?: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionLike = {
  lang?: string
  interimResults?: boolean
  continuous?: boolean
  onstart?: () => void
  onresult?: (event: SpeechRecognitionEventLike) => void
  onerror?: (event?: unknown) => void
  onend?: () => void
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

const ASSISTANT_CONTEXT_KEY = 'learnwell:assistant-context'

const assistantPrompts = [
  { title: 'Explain a topic', sample: 'Explain the difference between a for loop and a while loop in simple words.' },
  { title: 'Make a study plan', sample: 'Make a 30-minute study plan for my current material.' },
  { title: 'Summarize material', sample: 'Summarize this lesson in three clear points.' },
]

function readAssistantContext(): AssistantContext | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(ASSISTANT_CONTEXT_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AssistantContext
  } catch {
    return null
  }
}

type StudentNotes = ReturnType<typeof useStudentWorkspace>['notes']

function findMatchingMaterial(query: string) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9+# ]/g, ' ').replace(/\s+/g, ' ').trim()
  return learningMaterials.find((material) =>
    normalized.includes(material.title.toLowerCase())
    || normalized.includes(material.subject.toLowerCase())
  )
}

function findMatchingNote(query: string, notes: StudentNotes) {
  const normalized = query.toLowerCase()
  return notes.find((note) => normalized.includes(note.title.toLowerCase()) || normalized.includes(note.subject.toLowerCase()))
}

function getLessonContext(materialId: string | undefined, sectionId?: string): AssistantContext | null {
  if (!materialId || !learningLessons[materialId]) return null

  const lesson = learningLessons[materialId]
  const section = lesson.sections.find((item) => item.id === sectionId) ?? lesson.sections[0]
  const codeBlock = section?.blocks.find((block) => block.type === 'code')

  return {
    route: `/materials/${materialId}`,
    materialId,
    sectionId: section?.id,
    title: lesson.title,
    subject: lesson.subject,
    sectionTitle: section?.title,
    code: codeBlock?.type === 'code' ? codeBlock.code : undefined,
    summary: lesson.introduction,
  }
}

function getNoteContext(noteId: string | undefined, notes: StudentNotes): AssistantContext | null {
  const note = notes.find((item) => item.id === noteId)
  if (!note) return null

  return {
    route: '/notes',
    noteId: note.id,
    noteTitle: note.title,
    subject: note.subject,
    summary: note.content,
  }
}

function describeCodeLine(line: string) {
  const trimmed = line.trim()
  const forLoop = trimmed.match(/^for\s+(\w+)\s+in\s+(.+):$/)
  const whileLoop = trimmed.match(/^while\s+(.+):$/)
  const increment = trimmed.match(/^(\w+)\s*\+=\s*(.+?)(?:\s+#.*)?$/)
  const print = trimmed.match(/^print\((.*)\)/)
  const assignment = trimmed.match(/^(\w+)\s*=\s*(.+)$/)

  if (forLoop) return `It takes each item from ${forLoop[2]} and names the current item ${forLoop[1]}.`
  if (whileLoop) return `It repeats the indented instructions while ${whileLoop[1]} is true.`
  if (increment) return `It increases ${increment[1]} by ${increment[2]}.`
  if (print) return `It displays ${print[1]}.`
  if (assignment) return `It stores ${assignment[2]} in ${assignment[1]}.`
  if (!trimmed || trimmed.startsWith('#')) return ''
  return `The instruction is ${trimmed}.`
}

function describeSection(section: LearningLessonSection) {
  return section.blocks.map((block) => {
    if (block.type === 'paragraph') return block.text
    if (block.type === 'list') return block.items.join(' ')
    const explanation = block.code.split('\n').map(describeCodeLine).filter(Boolean).join(' ')
    return `${block.label}. ${explanation}`
  }).join(' ')
}

function getCurrentSection(context: AssistantContext | null) {
  const lesson = context?.materialId ? learningLessons[context.materialId] : undefined
  const section = lesson?.sections.find((item) => item.id === context?.sectionId) ?? lesson?.sections[0]
  return lesson && section ? { lesson, section } : null
}

function describeCurrentContext(context: AssistantContext | null, notes: StudentNotes) {
  if (!context) return 'I do not see a recent lesson or note. Open a lesson or saved note, or ask me to continue the next unfinished material.'

  if (context.noteId) {
    const note = notes.find((item) => item.id === context.noteId)
    return note ? `Your active note is ${note.title}, for ${note.subject}. ${note.content}` : 'That saved note is no longer available.'
  }

  const current = getCurrentSection(context)
  if (current) return `Your active lesson is ${current.lesson.title}, in ${current.lesson.subject}. You are at ${current.section.title}. ${current.lesson.introduction}`

  return context.summary ?? 'I am tracking your current study context.'
}

function getLessonContent(context: AssistantContext | null, request: 'read' | 'explain' | 'summarize') {
  const current = getCurrentSection(context)
  if (!current) return null
  const { lesson, section } = current

  if (request === 'summarize') {
    return `${lesson.title}, ${lesson.subject}. ${lesson.introduction} The lesson sections are ${lesson.sections.map((item) => item.title.replace(/^\d+\.\s*/, '')).join(', ')}. The current section is ${section.title.replace(/^\d+\.\s*/, '')}. ${describeSection(section)}`
  }

  return `${request === 'read' ? `Reading ${section.title.replace(/^\d+\.\s*/, '')}.` : `Here is a simple explanation of ${section.title.replace(/^\d+\.\s*/, '')}.`} ${describeSection(section)}`
}

function findCode(context: AssistantContext | null, notes: StudentNotes, rawPrompt: string) {
  const fencedCode = rawPrompt.match(/```([\w+#-]+)?\s*\n?([\s\S]*?)```/)
  const labeledCode = rawPrompt.match(/(?:debug|fix|analyze|check)\s+(?:this\s+)?code\s*:?\s*\n([\s\S]+)/i)
  const pastedCode = fencedCode?.[2]?.trim() || labeledCode?.[1]?.trim()
  if (pastedCode) {
    return { code: pastedCode, label: 'pasted code', subject: fencedCode?.[1] ?? '' }
  }

  const current = getCurrentSection(context)
  if (current) {
    const codeBlock = current.section.blocks.find((block) => block.type === 'code')
    if (codeBlock?.type === 'code') return { code: codeBlock.code, label: codeBlock.label, subject: current.lesson.subject }
  }

  const note = context?.noteId ? notes.find((item) => item.id === context.noteId) : undefined
  const noteCode = note?.content.match(/```(?:\w+)?\s*([\s\S]*?)```/)
  return noteCode ? { code: noteCode[1].trim(), label: note?.title ?? 'saved note code', subject: note?.subject ?? '' } : null
}

function analyzeCurrentCode(context: AssistantContext | null, notes: StudentNotes, rawPrompt: string) {
  const source = findCode(context, notes, rawPrompt)
  if (!source) return 'I cannot find code in the currently open lesson or note. Open a lesson with a code example, or paste code in a fenced block or after “debug this code”.'

  const lines = source.code.split('\n')
  const whileLine = lines.findIndex((line) => /^\s*while\s+(\w+)\s*(?:<|>|==|!=)/.test(line))
  if (whileLine >= 0) {
    const variable = lines[whileLine].match(/^\s*while\s+(\w+)/)?.[1]
    const loopBody = lines.slice(whileLine + 1).join('\n')
    const updatesVariable = variable && new RegExp(`\\b${variable}\\s*(?:\\+=|-=|=)`).test(loopBody)
    if (!updatesVariable) {
      return `In ${source.label}, line ${whileLine + 1} checks ${variable}, but I cannot find an update to ${variable} inside the loop. The condition may stay true forever. Update ${variable} in the loop, then check that it eventually makes the condition false. This teaches an important while-loop rule: the loop body must make progress toward ending.`
    }
  }

  const missingColon = lines.findIndex((line) => /^\s*(if|elif|else|for|while|def|class)\b/.test(line) && !/:\s*(?:#.*)?$/.test(line))
  if (missingColon >= 0 && source.subject.toLowerCase().includes('python')) {
    return `In ${source.label}, line ${missingColon + 1} starts a Python control statement but is missing its ending colon. Add a colon after the condition or loop header. Python uses that colon to begin the indented block.`
  }

  const loopDescription = lines.find((line) => /^\s*for\s+/.test(line))
    ? 'It processes each item in a sequence, one at a time.'
    : whileLine >= 0
      ? 'It repeats while its condition is true and updates the condition variable inside the loop.'
      : 'I checked the code example structure and did not find a simple loop or Python-header issue.'
  return `I checked the actual code in ${source.label}. ${loopDescription} I did not find an obvious issue in the checks I can perform here. This is a basic local check, not a full compiler, so run it to confirm its behavior.`
}

function normalizeSpokenText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripWakePhrase(value: string) {
  return value
    .replace(/^(hey |ok |okay |hi |hello )?(learnwell|assistant)\b[,!. ]*/i, '')
    .trim()
}

function isEndSessionPhrase(value: string) {
  return /^(stop( listening| voice)?|cancel( voice)?|never mind|nevermind|goodbye|good bye|bye|that's all|thats all|quit|go to sleep|hang up)$/i.test(value)
}

function isGreetingPhrase(value: string) {
  return /^(hi|hello|hey|hey there|good morning|good afternoon|good evening)( there| learnwell| assistant)?[!?.]*$/i.test(value)
}

function describeUpcomingSchedule(relative: 'today' | 'tomorrow' | 'week' | 'calendar') {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  const toKey = (date: Date) => date.toISOString().slice(0, 10)
  const todayKey = toKey(today)
  const tomorrowKey = toKey(tomorrow)

  const matching = calendarEvents.filter((event) => {
    if (relative === 'today') return event.date === todayKey
    if (relative === 'tomorrow') return event.date === tomorrowKey
    if (relative === 'week') return event.date >= todayKey && event.date <= toKey(weekEnd)
    return true
  }).sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time))

  const spoken = matching.map((event) => {
    const label = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(`${event.date}T12:00:00`))
    return `${event.title} on ${label} at ${event.time}`
  })

  if (relative === 'today') {
    return spoken.length
      ? `Today you have ${spoken.join(', and ')}.`
      : 'You do not have a scheduled sample event today.'
  }
  if (relative === 'tomorrow') {
    return spoken.length
      ? `Tomorrow you have ${spoken.join(', and ')}.`
      : 'You do not have a scheduled sample event tomorrow.'
  }
  if (!spoken.length) return 'I do not see upcoming sample events on your calendar.'
  return `Your upcoming schedule includes ${spoken.join(', and ')}.`
}

function buildTutorAnswer(rawPrompt: string, context: AssistantContext | null, notes: StudentNotes) {
  const value = rawPrompt.toLowerCase()
  if (/(debug|error|fix|bug|issue|problem)/.test(value)) return analyzeCurrentCode(context, notes, rawPrompt)

  if (value.includes('python') && context?.subject?.toLowerCase() === 'python') {
    return getLessonContent(context, 'explain') ?? 'Python runs instructions in order. A for loop processes each item in a sequence; a while loop repeats until its condition becomes false.'
  }
  if (/\b(c\+\+|cpp)\b/.test(value)) return 'C++ is a programming language that supports both step-by-step procedural code and object-oriented code. A class groups related data and functions; an object is one value created from that class.'
  if (/\bjava\b/.test(value)) return 'In Java, a class defines the data and methods a kind of object can have. An object is one instance of that class. Methods describe actions, and fields hold the object’s state.'
  if (/\bsql\b/.test(value)) return 'SQL lets you ask questions of relational tables. SELECT chooses columns, FROM names a table, and WHERE filters rows. JOIN combines related rows from tables; start with SELECT and FROM, then add one condition at a time.'
  if (/\bc\b/.test(value)) return 'C is a procedural language: a program runs functions and works with values stored in memory. A pointer stores the address of another value, so check what it points to before using it.'
  if (/(data structure|\bds\b)/.test(value)) return 'A data structure is a way to organize values so an operation is convenient. An array supports indexed access; a stack is last-in, first-out; a queue is first-in, first-out. Choose based on the operations your task needs.'
  if (/\balgorithm\b/.test(value)) return 'An algorithm is a finite sequence of steps for solving a problem. State the input and expected output, walk through a small example, then check edge cases and how the work grows as input grows.'
  if (/\boop\b|object.oriented/.test(value)) return 'Object-oriented programming groups data and related behavior. A class is the definition; an object is a particular instance. Encapsulation controls access to state, inheritance reuses or specializes behavior, and polymorphism lets different objects respond to the same operation.'
  if (context?.materialId) return getLessonContent(context, 'explain') ?? describeCurrentContext(context, notes)
  return 'I can explain C, C++, Java, Python, SQL, data structures, algorithms, and OOP. For an explanation grounded in your course, open the relevant lesson or note first; the current app contains structured lesson content only for Python loops.'
}

function buildAssistantReply(
  rawPrompt: string,
  context: AssistantContext | null,
  notes: StudentNotes,
  completedMaterials: string[],
  completedAssignments: string[],
  navigate: ReturnType<typeof useNavigate>,
) {
  const value = stripWakePhrase(rawPrompt.toLowerCase().trim())
  const asksToOpen = /\b(open|show|go to|take me to|view|launch)\b/.test(value)
  const asksForNotes = /\bnotes?\b/.test(value)

  if (isEndSessionPhrase(value)) return 'Okay. I will stop listening. Tap the voice button when you need me again.'
  if (isGreetingPhrase(value) || /^(what'?s up|how are you)\b/.test(value)) {
    return 'Hi, I am Learnwell, your study voice assistant. Ask me to open a lesson, explain a topic, continue studying, or check your schedule.'
  }
  if (/^(what can you do|what do you do|how do you work|your commands|help me( out)?)$/.test(value)) {
    return 'You can talk to me like a study assistant. Try: open my notes, continue my lesson, explain this, debug this code, what is on my calendar today, or take me to the quiz.'
  }
  if (/^(thanks|thank you|thanks a lot|thank you so much)[!?.]*$/.test(value)) {
    return 'You are welcome. What would you like to study next?'
  }

  if (/\b(calendar|schedule|agenda)\b/.test(value) || /\b(today|tomorrow)\b/.test(value) && /\b(class|event|due|quiz|assignment)\b/.test(value)) {
    const relative = /\btomorrow\b/.test(value) ? 'tomorrow' : /\btoday\b/.test(value) ? 'today' : /\bweek\b/.test(value) ? 'week' : 'calendar'
    if (asksToOpen || /\b(show|check|look|what|what'?s)\b/.test(value)) navigate('/calendar')
    return describeUpcomingSchedule(relative)
  }

  if (asksToOpen && /\b(quiz|practice)\b/.test(value)) {
    navigate('/quiz')
    return 'Opening your practice quiz.'
  }
  if (asksToOpen && /\bassignments?\b/.test(value)) {
    navigate('/assignments')
    return 'Opening your assignments.'
  }
  if (asksToOpen && /\b(dashboard|home)\b/.test(value)) {
    navigate('/')
    return 'Taking you back to your dashboard.'
  }
  if (asksToOpen && /\bprogress\b/.test(value)) {
    navigate('/progress')
    return `You have completed ${completedMaterials.length} of ${learningMaterials.length} lessons and ${completedAssignments.length} of ${assignments.length} assignments.`
  }
  if (/\bprogress\b/.test(value) || /how am i doing/.test(value)) {
    return `You have completed ${completedMaterials.length} of ${learningMaterials.length} lessons and ${completedAssignments.length} of ${assignments.length} assignments. Your sample study streak is 4 days.`
  }
  if (/\b(where am i|what am i studying|current lesson|what is this)\b/.test(value)) {
    return describeCurrentContext(context, notes)
  }

  if (asksToOpen && asksForNotes) {
    const note = findMatchingNote(value, notes)
    if (!note) {
      const requestedSubject = value
        .replace(/\b(open|show|go|to|view|launch|my|the|saved|notes?|please|all|in|for)\b/g, ' ')
        .trim()
      if (!requestedSubject) {
        navigate('/notes')
        return `Opening your saved notes. There are ${notes.length} saved ${notes.length === 1 ? 'note' : 'notes'}.`
      }
      const available = notes.length ? notes.map((item) => `${item.title} (${item.subject})`).join(', ') : 'none'
      return `I could not find a saved note matching that request. Your available notes are: ${available}.`
    }
    navigate(`/notes?note=${encodeURIComponent(note.id)}`)
    return `Opening your ${note.subject} note, ${note.title}.`
  }

  if (asksToOpen) {
    const material = findMatchingMaterial(value)
    if (material) {
      if (!learningLessons[material.id]) {
        navigate(`/materials?subject=${encodeURIComponent(material.subject)}`)
        return `The app lists ${material.title} in ${material.subject}, but it does not have readable lesson content for it yet. I opened that subject’s material list.`
      }
      navigate(`/materials/${material.id}`)
      return `Opening ${material.title}, in ${material.subject}.`
    }
  }

  if (/\b(continue|resume|next)\b/.test(value)) {
    const currentMaterial = context?.materialId ? learningLessons[context.materialId] : undefined
    const currentSectionIndex = currentMaterial?.sections.findIndex((section) => section.id === context?.sectionId) ?? -1
    const nextSection = currentMaterial?.sections[currentSectionIndex + 1]
    if (currentMaterial && nextSection) {
      navigate(`/materials/${currentMaterial.materialId}#${nextSection.id}`)
      return `Continuing ${currentMaterial.title}. ${nextSection.title.replace(/^\d+\.\s*/, '')}. ${describeSection(nextSection)}`
    }
    if (currentMaterial && currentSectionIndex >= 0) {
      const unfinished = learningMaterials.find((item) =>
        item.id !== currentMaterial.materialId
        && !completedMaterials.includes(item.id)
        && learningLessons[item.id],
      )
      if (unfinished) {
        navigate(`/materials/${unfinished.id}`)
        return `You reached the end of ${currentMaterial.title}. Your next unfinished lesson with available content is ${unfinished.title}, in ${unfinished.subject}. ${learningLessons[unfinished.id].introduction}`
      }
      return `You reached the end of ${currentMaterial.title}. There are no other unfinished materials with readable lesson content in the app.`
    }
    const lastLesson = learningLessons[context?.materialId ?? '']
    const nextAvailableMaterial = (lastLesson && !completedMaterials.includes(lastLesson.materialId)
      ? lastLesson
      : undefined)
      ?? learningMaterials.find((item) => !completedMaterials.includes(item.id) && learningLessons[item.id])
    const nextAvailable = nextAvailableMaterial
      ? learningLessons['materialId' in nextAvailableMaterial ? nextAvailableMaterial.materialId : nextAvailableMaterial.id]
      : undefined
    if (nextAvailable) {
      const firstSection = nextAvailable.sections[0]
      navigate(`/materials/${nextAvailable.materialId}${firstSection ? `#${firstSection.id}` : ''}`)
      return `Continuing your next unfinished lesson, ${nextAvailable.title}, in ${nextAvailable.subject}. ${nextAvailable.introduction}`
    }
    return 'I could not find a recent unfinished lesson with readable content. Open a lesson first, or check the materials list.'
  }

  if (/\b(read|summari[sz]e|explain|teach)\b/.test(value)) {
    if (context?.noteId) {
      const note = notes.find((item) => item.id === context.noteId)
      if (note) {
        if (/summari[sz]e/.test(value)) {
          const keyPoints = note.content.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3).join(' ')
          return `Summary of ${note.title}, for ${note.subject}: ${keyPoints || note.content}`
        }
        if (/\b(explain|teach)\b/.test(value)) return `The main idea in ${note.title}, for ${note.subject}, is: ${note.content}`
        return `Reading your note, ${note.title}, for ${note.subject}. ${note.content}`
      }
    }
    const kind = /summari[sz]e/.test(value) ? 'summarize' : /\bread\b/.test(value) ? 'read' : 'explain'
    return getLessonContent(context, kind) ?? (context ? describeCurrentContext(context, notes) : 'Open a lesson or saved note first so I can read its actual content.')
  }

  if (/(debug|error|fix|bug|issue|problem|\bcode\b)/.test(value)) return analyzeCurrentCode(context, notes, rawPrompt)
  if (value.includes('plan')) {
    const current = getCurrentSection(context)
    return current
      ? `For ${current.lesson.title}, review ${current.section.title.replace(/^\d+\.\s*/, '')}, explain its example in your own words, then try changing one value and predict the result.`
      : 'Choose one available lesson, read a section, and explain its example in your own words. The app currently has structured lesson content for Python loops.'
  }

  return buildTutorAnswer(rawPrompt, context, notes)
}

export function FeaturePage({ page }: FeaturePageProps) {
  const isAssistant = page.title === 'AI Assistant'
  const isHelp = page.title === 'Help'
  const navigate = useNavigate()
  const location = useLocation()
  const { notes, completedMaterials, completedAssignments } = useStudentWorkspace()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  const silenceTimerRef = useRef<number | null>(null)
  const keepListeningRef = useRef(false)
  const manualStopRef = useRef(false)
  const speakingReplyRef = useRef(false)
  const commandPendingRef = useRef(false)
  const recognitionEndedRef = useRef(true)
  const finalTranscriptRef = useRef('')
  const draftRef = useRef(assistantPrompts[0].sample)
  const handleUtteranceRef = useRef<(text: string) => void>(() => {})
  const resumeListeningRef = useRef<() => void>(() => {})
  const [selectedPrompt, setSelectedPrompt] = useState(assistantPrompts[0].title)
  const [draft, setDraft] = useState(assistantPrompts[0].sample)
  const [statusText, setStatusText] = useState('Tap the orb and talk to me like a study assistant.')
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: 'Hi, I am Learnwell. Tap the orb and say something like “open my notes”, “explain this lesson”, or “what is on my calendar today?”' },
  ])

  const context = useMemo<AssistantContext | null>(() => {
    const storedContext = readAssistantContext()
    const explicit = location.pathname.startsWith('/materials/')
      ? getLessonContext(location.pathname.split('/').at(-1), location.hash.slice(1))
      : location.pathname === '/notes'
        ? getNoteContext(new URLSearchParams(location.search).get('note') ?? storedContext?.noteId ?? notes[0]?.id, notes)
        : null
    return explicit ?? storedContext
  }, [location.hash, location.pathname, location.search, notes])

  useEffect(() => {
    if (!isAssistant) return

    return () => {
      keepListeningRef.current = false
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current)
      if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current)
      recognitionRef.current?.stop()
      recognitionRef.current = null
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [isAssistant])

  function handlePromptSelect(title: string, sample: string) {
    setSelectedPrompt(title)
    setDraft(sample)
    draftRef.current = sample
  }

  function submitPrompt(value: string, source: 'text' | 'voice' = 'text') {
    const prompt = value.trim()
    if (!prompt) return

    const reply = buildAssistantReply(prompt, context, notes, completedMaterials, completedAssignments, navigate)
    setMessages((current) => [...current, { role: 'user', text: prompt }, { role: 'assistant', text: reply }])
    if (source === 'voice') {
      setDraft(prompt)
      draftRef.current = prompt
      setStatusText('Voice command sent to the study assistant.')
    } else {
      setDraft('')
      draftRef.current = ''
    }
    setSelectedPrompt('Custom question')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextValue = normalizeCommandText(draftRef.current)
    if (!nextValue) return
    submitPrompt(nextValue)
  }

  function normalizeCommandText(value: string) {
    return normalizeSpokenText(value)
  }

  function clearVoiceTimers() {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }

  function chooseSpokenVoice() {
    if (!('speechSynthesis' in window)) return undefined
    const voices = window.speechSynthesis.getVoices()
    return voices.find((voice) => /en[-_]US/i.test(voice.lang) && /Google|Samantha|Natural|Premium/i.test(voice.name))
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
  }

  function speakReply(text: string, resumeListening: boolean) {
    commandPendingRef.current = false
    if (!('speechSynthesis' in window)) {
      speakingReplyRef.current = false
      if (resumeListening && keepListeningRef.current) resumeListeningRef.current()
      else {
        setVoicePhase('idle')
        setStatusText('Tap the orb when you want to talk again.')
      }
      return
    }

    speakingReplyRef.current = true
    setVoicePhase('speaking')
    setStatusText('Speaking… tap the orb to interrupt.')
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.04
    utterance.pitch = 1
    const voice = chooseSpokenVoice()
    if (voice) utterance.voice = voice
    utterance.onend = () => {
      speakingReplyRef.current = false
      if (resumeListening && keepListeningRef.current) resumeListeningRef.current()
      else {
        setVoicePhase('idle')
        setStatusText('Tap the orb when you want to talk again.')
      }
    }
    utterance.onerror = () => {
      speakingReplyRef.current = false
      if (resumeListening && keepListeningRef.current) resumeListeningRef.current()
      else setVoicePhase('idle')
    }
    window.speechSynthesis.speak(utterance)
  }

  function handleCompletedUtterance(rawPrompt: string) {
    const prompt = stripWakePhrase(normalizeCommandText(rawPrompt))
    if (!prompt || commandPendingRef.current) return

    commandPendingRef.current = true
    finalTranscriptRef.current = ''
    setLiveTranscript('')
    setVoicePhase('thinking')
    setStatusText('Thinking…')
    recognitionRef.current?.stop()

    const keepGoing = !isEndSessionPhrase(prompt)
    if (!keepGoing) keepListeningRef.current = false

    const reply = buildAssistantReply(prompt, context, notes, completedMaterials, completedAssignments, navigate)
    setMessages((current) => [...current, { role: 'user', text: prompt }, { role: 'assistant', text: reply }])
    setDraft(prompt)
    draftRef.current = prompt
    setSelectedPrompt('Custom question')
    speakReply(reply, keepGoing)
  }
  handleUtteranceRef.current = handleCompletedUtterance

  function queueUtterance(text: string) {
    if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = window.setTimeout(() => {
      silenceTimerRef.current = null
      handleUtteranceRef.current(text)
    }, 850)
  }

  function stopVoiceSession() {
    manualStopRef.current = true
    keepListeningRef.current = false
    speakingReplyRef.current = false
    commandPendingRef.current = false
    finalTranscriptRef.current = ''
    clearVoiceTimers()
    recognitionRef.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setVoicePhase('idle')
    setLiveTranscript('')
    setStatusText('Okay. I stopped listening. Tap the orb when you need me again.')
  }

  function handleVoiceOrbPress() {
    if (voicePhase === 'thinking') return
    if (voicePhase === 'speaking') {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      speakingReplyRef.current = false
      keepListeningRef.current = true
      startVoiceCapture()
      return
    }
    if (voicePhase === 'listening') {
      stopVoiceSession()
      return
    }
    startVoiceCapture()
  }

  function startVoiceCapture() {
    if (typeof window === 'undefined') return

    const Recognition = (window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }).SpeechRecognition ?? (window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }).webkitSpeechRecognition

    if (!Recognition) {
      setStatusText('Voice recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    manualStopRef.current = false
    keepListeningRef.current = true
    commandPendingRef.current = false
    finalTranscriptRef.current = ''
    setLiveTranscript('')
    const recognition = recognitionRef.current ?? new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onstart = () => {
      keepListeningRef.current = true
      recognitionEndedRef.current = false
      setVoicePhase('listening')
      setStatusText('Listening… speak naturally, then pause when you are done.')
    }
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (commandPendingRef.current || speakingReplyRef.current) return

      const results = Array.from(event.results)
      let finalChunk = ''
      let interimChunk = ''
      for (const result of results) {
        const text = Array.from(result).map((item) => item.transcript).join(' ').trim()
        if (result.isFinal) finalChunk = normalizeCommandText(`${finalChunk} ${text}`)
        else interimChunk = text
      }

      if (finalChunk) finalTranscriptRef.current = finalChunk
      const live = normalizeCommandText(`${finalTranscriptRef.current} ${interimChunk}`)
      if (!live) return

      setLiveTranscript(live)
      setDraft(live)
      draftRef.current = live
      setSelectedPrompt('Custom question')
      setStatusText('Listening…')

      const spoken = stripWakePhrase(live)
      if (isEndSessionPhrase(spoken)) {
        handleUtteranceRef.current(spoken)
        return
      }

      if (finalChunk && !interimChunk) queueUtterance(finalChunk)
    }
    recognition.onerror = (event) => {
      const error = typeof event === 'object' && event !== null && 'error' in event
        ? String((event as { error: unknown }).error)
        : ''
      if (error === 'no-speech') {
        setStatusText('Still listening. Ask me anything when you are ready.')
        return
      }
      if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') {
        stopVoiceSession()
        setStatusText(error === 'audio-capture'
          ? 'No microphone is available. Connect or enable a microphone, then try again.'
          : 'Microphone access is blocked. Allow microphone access in your browser, then try again.')
        return
      }
      setStatusText('Voice connection interrupted. Reconnecting…')
    }
    recognition.onend = () => {
      recognitionEndedRef.current = true
      if (speakingReplyRef.current || commandPendingRef.current) return

      if (manualStopRef.current) {
        setVoicePhase('idle')
        recognitionRef.current = null
        return
      }

      if (keepListeningRef.current) {
        setVoicePhase('listening')
        const scheduleRestart = () => {
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null
            if (manualStopRef.current || !keepListeningRef.current || speakingReplyRef.current) return
            try {
              recognitionRef.current?.start()
            } catch {
              setStatusText('Reconnecting… keep talking after the orb is listening again.')
              scheduleRestart()
            }
          }, 280)
        }
        scheduleRestart()
      }
    }

    recognitionRef.current = recognition
    setVoicePhase('listening')
    setStatusText('Requesting microphone access…')
    try {
      recognition.start()
    } catch {
      setStatusText('Reconnecting…')
      const retryStart = () => {
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null
          if (manualStopRef.current || !keepListeningRef.current || speakingReplyRef.current) return
          try {
            recognitionRef.current?.start()
          } catch {
            retryStart()
          }
        }, 600)
      }
      retryStart()
    }
  }

  resumeListeningRef.current = () => {
    if (!keepListeningRef.current || manualStopRef.current) {
      setVoicePhase('idle')
      return
    }
    finalTranscriptRef.current = ''
    setLiveTranscript('')
    setVoicePhase('listening')
    setStatusText('I’m listening for a follow-up. Tap the orb or say “stop” to hang up.')
    if (recognitionEndedRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch {
        startVoiceCapture()
      }
    } else if (!recognitionRef.current) {
      startVoiceCapture()
    }
  }

  return (
    <div className="feature-page">
      <p className="eyebrow">{page.eyebrow}</p>
      <h1 tabIndex={-1}>{page.title}</h1>
      <p className="feature-intro">{page.description}</p>
      {isAssistant && (
        <div className="notice-block">
          <Sparkles size={20} aria-hidden="true" />
          <p>Tap the orb and talk hands-free. Learnwell listens, answers out loud, then keeps listening for a follow-up—like a study voice assistant.</p>
        </div>
      )}
      {isHelp && <div className="notice-block"><CircleHelp size={20} aria-hidden="true" /><p>For this prototype, support details are examples and do not send a message.</p></div>}
      {page.title === 'Logout' && <div className="notice-block"><BookOpen size={20} aria-hidden="true" /><p>You are viewing a local prototype. No account is signed in, and no sign-out action is available.</p></div>}

      {isAssistant ? (
        <div className="assistant-preview" aria-labelledby="assistant-preview-heading">
          <div className="assistant-context">
            <div className="assistant-overview">
              <p className="eyebrow">Current study context</p>
              <h2 id="assistant-preview-heading">{context?.title ? `${context.subject ?? 'Current'} · ${context.title}` : 'AI study assistant'}</h2>
              <p>{describeCurrentContext(context, notes)}</p>
            </div>
            <ul className="assistant-metrics" aria-label="Study assistant overview">
              <li><strong>{learningMaterials.length}</strong><span>materials</span></li>
              <li><strong>{notes.length}</strong><span>notes</span></li>
              <li><strong>{voicePhase === 'idle' ? 'Ready' : voicePhase === 'listening' ? 'Listening' : voicePhase === 'thinking' ? 'Thinking' : 'Speaking'}</strong><span>voice</span></li>
            </ul>
          </div>

          <div className="voice-bot" aria-label="Learnwell voice assistant">
            <button
              type="button"
              className={`voice-orb ${voicePhase}`}
              onClick={handleVoiceOrbPress}
              aria-pressed={voicePhase !== 'idle'}
              aria-label={
                voicePhase === 'listening' ? 'Stop listening'
                  : voicePhase === 'speaking' ? 'Interrupt and listen'
                    : voicePhase === 'thinking' ? 'Learnwell is thinking'
                      : 'Start talking to Learnwell'
              }
            >
              <Mic size={28} aria-hidden="true" />
            </button>
            <p className="voice-bot-label">{
              voicePhase === 'listening' ? 'Listening'
                : voicePhase === 'thinking' ? 'Thinking'
                  : voicePhase === 'speaking' ? 'Speaking'
                    : 'Tap to talk'
            }</p>
            <p className="voice-caption" aria-live="polite">{liveTranscript || statusText}</p>
          </div>

          <div className="assistant-actions" aria-label="Suggested prompts">
            {assistantPrompts.map(({ title, sample }) => (
              <button
                key={title}
                type="button"
                className={selectedPrompt === title ? 'assistant-chip selected' : 'assistant-chip'}
                onClick={() => handlePromptSelect(title, sample)}
              >
                {title}
              </button>
            ))}
            <button type="button" className={voicePhase === 'listening' ? 'assistant-chip selected' : 'assistant-chip'} onClick={handleVoiceOrbPress} aria-pressed={voicePhase !== 'idle'}>
              {voicePhase === 'listening' ? <><Mic size={14} aria-hidden="true" /> Hang up</> : <><Mic size={14} aria-hidden="true" /> Talk to Learnwell</>}
            </button>
            <button type="button" className="assistant-chip" onClick={() => {
              const response = describeCurrentContext(context, notes)
              setMessages((current) => [...current, { role: 'assistant', text: response }])
              keepListeningRef.current = false
              recognitionRef.current?.stop()
              speakReply(response, false)
            }}>
              <Volume2 size={14} aria-hidden="true" /> Read aloud
            </button>
          </div>

          <div className="voice-status" aria-live="polite">{statusText}</div>

          <div className="assistant-chat" aria-live="polite" aria-atomic="false">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'assistant' ? 'assistant-message assistant' : 'assistant-message user'}>
                <div className="assistant-avatar" aria-hidden="true">{message.role === 'assistant' ? <BrainCircuit size={14} /> : 'You'}</div>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <form className="assistant-composer" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="assistant-input">Ask the AI study assistant</label>
            <textarea
              id="assistant-input"
              rows={3}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                draftRef.current = event.target.value
              }}
              placeholder="Ask out loud or type: Open my notes, continue my last lesson, explain this, what’s on my calendar today…"
            />
            <button type="submit" className="button button-primary">
              <SendHorizonal size={15} aria-hidden="true" />
              Ask
            </button>
          </form>
        </div>
      ) : (
        <section className="feature-section" aria-labelledby="feature-items-heading">
          <div className="feature-section-heading">
            <h2 id="feature-items-heading">{page.title === 'Accessibility Settings' ? 'Current settings' : 'In this section'}</h2>
            <span className="sample-label">SAMPLE CONTENT</span>
          </div>
          <ul className="feature-list">
            {page.items.map((item) => (
              <li key={item.title}>
                <span className="feature-list-icon" aria-hidden="true">{page.title === 'Notes' ? <FileText size={19} /> : <BookOpen size={19} />}</span>
                <div><h3>{item.title}</h3><p>{item.detail}</p></div>
                <span className="feature-meta">{item.meta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link className="back-link" to="/"><ArrowRight size={15} aria-hidden="true" /> Back to dashboard</Link>
    </div>
  )
}