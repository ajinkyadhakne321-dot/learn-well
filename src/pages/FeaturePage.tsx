import { ArrowRight, BookOpen, BrainCircuit, CircleHelp, FileText, Mic, SendHorizonal, Sparkles, Volume2 } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import { learningLessons, type LearningLessonSection } from '../data/learningLessonContent'
import { learningMaterials } from '../data/mockLearningData'

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
  navigate: ReturnType<typeof useNavigate>,
) {
  const value = rawPrompt.toLowerCase().trim()
  const asksToOpen = /\b(open|show|go to|view|launch)\b/.test(value)
  const asksForNotes = /\bnotes?\b/.test(value)

  if (/^(stop listening|stop voice|cancel voice)$/.test(value)) return 'Voice input stopped.'

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
  const { notes, completedMaterials } = useStudentWorkspace()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const keepListeningRef = useRef(false)
  const speakingReplyRef = useRef(false)
  const commandPendingRef = useRef(false)
  const recognitionEndedRef = useRef(true)
  const [selectedPrompt, setSelectedPrompt] = useState(assistantPrompts[0].title)
  const [draft, setDraft] = useState(assistantPrompts[0].sample)
  const [statusText, setStatusText] = useState('Voice ready')
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: 'Hi! I can help you explain a concept, continue a lesson, or debug the code you are studying.' },
    { role: 'user', text: 'Open my current lesson' },
    { role: 'assistant', text: 'I can do that. I will use your current learning context and open the most relevant material or note.' },
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
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [isAssistant])

  function handlePromptSelect(title: string, sample: string) {
    setSelectedPrompt(title)
    setDraft(sample)
  }

  function submitPrompt(value: string, source: 'text' | 'voice' = 'text') {
    const prompt = value.trim()
    if (!prompt) return

    const reply = buildAssistantReply(prompt, context, notes, completedMaterials, navigate)
    setMessages((current) => [...current, { role: 'user', text: prompt }, { role: 'assistant', text: reply }])
    setDraft('')
    setSelectedPrompt('Custom question')
    if (source === 'voice') {
      setStatusText('Voice command sent to the study assistant.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitPrompt(draft)
  }

  function stopVoiceCapture() {
    keepListeningRef.current = false
    speakingReplyRef.current = false
    commandPendingRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
    setStatusText('Voice input stopped. Press Voice command to start again.')
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
      setStatusText('Voice recognition is not supported in this browser.')
      return
    }

    if (recognitionRef.current && keepListeningRef.current) {
      stopVoiceCapture()
      return
    }

    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onstart = () => {
      keepListeningRef.current = true
      recognitionEndedRef.current = false
      setIsListening(true)
      setStatusText('Listening for your command…')
    }
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      if (commandPendingRef.current) return

      const results = Array.from(event.results)
      const lastResult = results[results.length - 1]
      const transcript = lastResult ? Array.from(lastResult).map((item) => item.transcript).join(' ').trim() : ''
      const finalTranscript = transcript && (!lastResult || !('isFinal' in lastResult) || lastResult.isFinal)
        ? transcript
        : ''

      if (!finalTranscript) {
        if (transcript) {
          setDraft(transcript)
          setStatusText('Listening… I heard a prompt and am preparing to send it.')
        }
        return
      }

      commandPendingRef.current = true
      setDraft(finalTranscript)
      setSelectedPrompt('Custom question')
      setStatusText('Command heard. Sending it to the study assistant…')

      if (/^(stop listening|stop voice|cancel voice)$/i.test(finalTranscript)) {
        keepListeningRef.current = false
        setStatusText('Voice input stopped. Press Voice command to start again.')
        recognition.stop()
        return
      }

      keepListeningRef.current = false
      recognition.stop()

      window.setTimeout(() => {
        submitPrompt(finalTranscript, 'voice')

        const reply = buildAssistantReply(finalTranscript, context, notes, completedMaterials, navigate)
        if ('speechSynthesis' in window) {
          speakingReplyRef.current = true
          setIsListening(false)
          setStatusText('Speaking the response.')
          const utterance = new SpeechSynthesisUtterance(reply)
          utterance.rate = 0.94
          utterance.pitch = 1
          utterance.onend = () => {
            speakingReplyRef.current = false
            commandPendingRef.current = false
            setIsListening(false)
            setStatusText('Voice ready')
            recognitionRef.current = null
          }
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
        } else {
          commandPendingRef.current = false
          setIsListening(false)
          setStatusText('Voice ready')
        }
      }, 150)
    }
    recognition.onerror = (event) => {
      const error = typeof event === 'object' && event !== null && 'error' in event
        ? String((event as { error: unknown }).error)
        : ''
      if (error === 'no-speech') {
        setStatusText('I did not hear a command. Press Voice command to try again.')
        keepListeningRef.current = false
        setIsListening(false)
        return
      }
      if (keepListeningRef.current) {
        keepListeningRef.current = false
        commandPendingRef.current = false
        setStatusText(error === 'not-allowed' || error === 'service-not-allowed'
          ? 'Microphone access is blocked. Allow microphone access in your browser, then try again.'
          : 'Voice input stopped. Press Voice command to start again.')
        setIsListening(false)
      }
    }
    recognition.onend = () => {
      recognitionEndedRef.current = true
      if (speakingReplyRef.current) {
        setIsListening(false)
        return
      }
      if (!keepListeningRef.current) {
        commandPendingRef.current = false
        setIsListening(false)
        setStatusText('Voice ready')
        recognitionRef.current = null
        return
      }
      setIsListening(false)
      setStatusText('Voice command ended. Press Voice command to start again.')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    keepListeningRef.current = true
    setIsListening(true)
    setStatusText('Requesting microphone access…')
    try {
      recognition.start()
    } catch {
      keepListeningRef.current = false
      setIsListening(false)
      setStatusText('Voice input is already active. Please wait a moment and try again.')
      recognitionRef.current = null
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
          <p>This AI agent uses your current lesson and note context and can respond to natural voice commands.</p>
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
              <li><strong>{isListening ? 'Listening' : 'Ready'}</strong><span>voice</span></li>
            </ul>
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
            <button type="button" className={isListening ? 'assistant-chip selected' : 'assistant-chip'} onClick={isListening ? stopVoiceCapture : startVoiceCapture} aria-pressed={isListening}>
              {isListening ? <><Mic size={14} aria-hidden="true" /> Stop listening</> : <><Mic size={14} aria-hidden="true" /> Voice command</>}
            </button>
            <button type="button" className="assistant-chip" onClick={() => {
              const response = describeCurrentContext(context, notes)
              setMessages((current) => [...current, { role: 'assistant', text: response }])
              if (keepListeningRef.current) {
                keepListeningRef.current = false
                commandPendingRef.current = false
                recognitionRef.current?.stop()
                recognitionRef.current = null
                setIsListening(false)
                setStatusText('Voice input paused while reading aloud. Select Voice command to continue.')
              }
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(response)
                window.speechSynthesis.cancel()
                window.speechSynthesis.speak(utterance)
              }
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
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Examples: Open my notes, continue my last lesson, explain this, debug this code..."
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