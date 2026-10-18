import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  FilePlus,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  Headphones,
  CheckCircle2,
  BookOpen,
  Code,
  Calculator,
  FileText,
  FlaskConical,
  Rocket,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import {
  playChimeCancel,
  playChimeError,
  playChimeListeningStart,
  playChimeProcessing,
  playChimeSuccess,
  playChimeNoteSaved,
  playChimeTurnPrompt,
} from '../services/soundEffects'
import {
  cancelSpeech,
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakText,
  type ISpeechRecognition,
  type SpeechRate,
} from '../services/speechService'
import {
  fetchAssistantStatus,
  sendAssistantMessage,
  type AssistantAction,
  type LearningMode,
  type MathVerification,
  type SourceReference,
} from '../services/assistantApi'

export interface PageChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  mode?: LearningMode
  math_verification?: MathVerification | null
  sources?: SourceReference[]
  action?: AssistantAction
  timestamp: string
}

const LEARNING_MODES: Array<{ id: LearningMode; label: string; icon: typeof BookOpen; desc: string }> = [
  { id: 'Academic Learning', label: 'Academic Learning', icon: BookOpen, desc: 'Concepts, analogies & syllabus depth' },
  { id: 'Programming & Coding', label: 'Programming & Coding', icon: Code, desc: 'Clean commented code, Big-O & algorithms' },
  { id: 'Engineering Mathematics', label: 'Engineering Math', icon: Calculator, desc: 'Step-by-step calculus & SymPy verification' },
  { id: 'Exam Preparation', label: 'Exam Prep', icon: FileText, desc: 'High-yield archetypes & revision answers' },
  { id: 'Practical & Viva', label: 'Practical & Viva', icon: FlaskConical, desc: 'Lab apparatus, procedures & viva Q&A' },
  { id: 'Project Guidance', label: 'Project Guidance', icon: Rocket, desc: 'Architecture, prototyping & milestones' },
]

const QUICK_PROMPTS_BY_MODE: Record<LearningMode, string[]> = {
  'Academic Learning': [
    'What are ACID properties in database systems?',
    'Explain Von Neumann vs Harvard architecture',
    'What is the difference between TCP and UDP?',
    'Explain Polymorphism and Inheritance with examples',
  ],
  'Programming & Coding': [
    'Explain QuickSort with step-by-step python code',
    'How do I implement binary search recursively?',
    'What is the difference between BFS and DFS?',
    'Explain Big-O time and space complexity with examples',
  ],
  'Engineering Mathematics': [
    'Find the derivative of x^3 + 4*x',
    'Solve the differential equation dy/dx + 2*y = 4*x',
    'Calculate the integral of sin(x)*cos(x)',
    'Compute eigenvalues and eigenvectors of a 2x2 matrix',
  ],
  'Exam Preparation': [
    'Give a 10-mark model answer for OS deadlock conditions',
    'Summarize Software Requirements Specification (SRS)',
    'Top 5 high-yield exam questions on Computer Networks',
  ],
  'Practical & Viva': [
    'What are common errors in the diode characteristics lab?',
    'Viva questions on sorting algorithms complexity',
    'Explain apparatus ratings and safety in circuits lab',
  ],
  'Project Guidance': [
    'Suggest system architecture for an accessible web app',
    'How to choose between relational and document databases',
    'Step-by-step implementation roadmap for capstone project',
  ],
}

export function AssistantPage() {
  const [messages, setMessages] = useState<PageChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: 'Welcome to your Local Voice Assistant! I run completely locally with zero paid API keys required. Choose a learning mode, speak or type your question, and explore math derivations, coding, or syllabus concepts.',
      timestamp: 'Ready',
    },
  ])
  const [activeMode, setActiveMode] = useState<LearningMode>('Academic Learning')
  const [branch, setBranch] = useState('')
  const [semester, setSemester] = useState('')
  const [subject, setSubject] = useState('')
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1.25)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [handsFreeMode, setHandsFreeMode] = useState(false)
  const [statusInfo, setStatusInfo] = useState<{
    available: boolean
    activeModel?: string
    pythonAgentRunning?: boolean
    ollamaRunning?: boolean
  } | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const location = useLocation()
  const navigate = useNavigate()
  const { notes, saveNote, preferences, updatePreferences, profile, setActiveQuiz } = useStudentWorkspace()

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAssistantStatus()
      .then((data) => setStatusInfo(data))
      .catch(() => setStatusInfo({ available: true, activeModel: 'local-tutor' }))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      cancelSpeech()
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [])

  function stopAudioPlayback() {
    try {
      stopListening()
      cancelSpeech()
      setIsSpeaking(false)
      playChimeCancel()
      announce('Voice playback stopped.')
    } catch (err) {
      console.warn('Error in stopAudioPlayback:', err)
    }
  }

  function handleCloseAssistant() {
    try {
      stopAudioPlayback()
    } catch (err) {
      console.warn('Error during close cleanup:', err)
    }

    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  function announce(text: string) {
    setAnnouncement(text)
  }

  function handleExecuteAction(action: AssistantAction) {
    if (!action) return

    if (action.type === 'CREATE_NOTE') {
      playChimeNoteSaved()
    } else {
      playChimeSuccess()
    }

    switch (action.type) {
      case 'CLOSE':
        announce('Closing Voice Assistant.')
        handleCloseAssistant()
        break

      case 'NAVIGATE':
        if (action.target) {
          navigate(action.target)
          announce(`Navigated to ${action.label || action.target}`)
        }
        break

      case 'LOAD_QUIZ':
        if (action.questions && action.questions.length > 0) {
          setActiveQuiz({
            subject: action.subject || 'Practice',
            title: action.title || 'Practice Quiz',
            questions: action.questions as any,
          })
          navigate('/quiz')
          announce(`Loaded practice quiz for ${action.subject || 'Practice'}. Navigating to Quiz.`)
        }
        break

      case 'CREATE_NOTE':
        if (action.title && action.content) {
          saveNote({
            id: `note-${Date.now()}`,
            title: action.title,
            subject: action.subject || 'General Study',
            content: action.content,
            updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          })
          announce(`Saved new note: ${action.title}`)
        }
        break

      case 'SET_ACCESSIBILITY': {
        const nextPreferences = { ...preferences }
        if (action.highContrast !== undefined) nextPreferences.highContrast = action.highContrast
        if (action.textSize) nextPreferences.textSize = action.textSize
        if (action.underlineLinks !== undefined) nextPreferences.underlineLinks = action.underlineLinks
        if (action.strongerFocus !== undefined) nextPreferences.strongerFocus = action.strongerFocus
        updatePreferences(nextPreferences)
        announce('Accessibility settings updated.')
        break
      }

      case 'READ_ALOUD':
        if (action.text && voiceEnabled) {
          speakText(action.text, {
            rate: speechRate,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          })
        }
        break

      default:
        break
    }
  }

  async function handleSendMessage(queryText: string) {
    const trimmed = queryText.trim()
    if (!trimmed) return

    if (
      /^(close|exit|quit|dismiss|leave|bye|goodbye|stop|close tab|close assistant|close voice assistant)$/i.test(trimmed) ||
      /\b(close|exit|leave|dismiss|quit|hide|shut)\s+(the\s+|this\s+)?(ai\s+)?(voice\s+)?(assistant|tab|drawer|dialog|window)\b/i.test(trimmed)
    ) {
      setHandsFreeMode(false)
      announce('Closing Voice Assistant.')
      handleCloseAssistant()
      return
    }

    if (/^(stop listening|disable auto listen|stop hands free|disable hands free)\b/i.test(trimmed)) {
      setHandsFreeMode(false)
      stopListening()
      cancelSpeech()
      announce('Hands-free auto-listening turned off.')
      return
    }

    cancelSpeech()
    setInputText('')

    const userMsg: PageChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: trimmed,
      mode: activeMode,
      timestamp: 'Just now',
    }
    setMessages((prev) => [...prev, userMsg])
    setIsThinking(true)
    playChimeProcessing()
    announce('Processing your question...')

    try {
      const res = await sendAssistantMessage(
        trimmed,
        {
          currentPath: location.pathname,
          pageTitle: 'Voice Assistant Hub',
          studentName: profile.name,
          notesCount: notes.length,
          preferences: {
            highContrast: preferences.highContrast,
            textSize: preferences.textSize,
            underlineLinks: preferences.underlineLinks,
          },
          history: messages.slice(-8).map((m) => ({
            role: m.sender,
            text: m.text,
          })),
        },
        {
          mode: activeMode,
          branch: branch || undefined,
          semester: semester || undefined,
          subject: subject || undefined,
        }
      )

      const botMsg: PageChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'assistant',
        text: res.response || res.spokenText,
        mode: res.mode || activeMode,
        math_verification: res.math_verification,
        sources: res.sources,
        action: res.action,
        timestamp: 'Just now',
      }
      setMessages((prev) => [...prev, botMsg])
      announce(res.spokenText)

      if (voiceEnabled) {
        setIsSpeaking(true)
        speakText(res.spokenText, {
          rate: speechRate,
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false)
            if (res.action) handleExecuteAction(res.action)
            if (handsFreeMode && res.action?.type !== 'NAVIGATE') {
              setTimeout(() => {
                playChimeTurnPrompt()
                startListening()
              }, 400)
            }
          },
          onError: () => {
            setIsSpeaking(false)
            if (res.action) handleExecuteAction(res.action)
            if (handsFreeMode && res.action?.type !== 'NAVIGATE') {
              setTimeout(() => {
                playChimeTurnPrompt()
                startListening()
              }, 400)
            }
          },
        })
      } else {
        if (res.action) handleExecuteAction(res.action)
        if (handsFreeMode && res.action?.type !== 'NAVIGATE') {
          setTimeout(() => {
            playChimeTurnPrompt()
            startListening()
          }, 400)
        }
      }
    } catch {
      playChimeError()
      const errorMsg: PageChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: 'Sorry, I had trouble processing that request. Please make sure the local tutor or ollama is active.',
        timestamp: 'Just now',
      }
      setMessages((prev) => [...prev, errorMsg])
      announce('An error occurred. Please try again.')
    } finally {
      setIsThinking(false)
    }
  }

  function startListening() {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.')
      return
    }

    cancelSpeech()
    setIsSpeaking(false)

    try {
      playChimeListeningStart()
      announce('Listening for your voice. Speak now.')

      const recognizer = createSpeechRecognizer({
        onStart: () => setIsListening(true),
        onResult: (transcript, isFinal) => {
          setInputText(transcript)
          if (isFinal) {
            stopListening()
            void handleSendMessage(transcript)
          }
        },
        onError: () => {
          setIsListening(false)
          playChimeError()
          announce('Could not understand audio. Please try again.')
        },
        onEnd: () => setIsListening(false),
      })

      if (recognizer) {
        recognitionRef.current = recognizer
        recognizer.start()
      }
    } catch {
      setIsListening(false)
      playChimeError()
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  function toggleListening() {
    if (isListening) {
      stopListening()
      announce('Microphone muted.')
    } else {
      startListening()
    }
  }

  function cycleSpeechRate() {
    const rates: SpeechRate[] = [1, 1.25, 1.5]
    const nextIndex = (rates.indexOf(speechRate) + 1) % rates.length
    const nextRate = rates[nextIndex]
    setSpeechRate(nextRate)
    announce(`Speech speed set to ${nextRate}x`)
  }

  return (
    <div className="assistant-page-container">
      {/* Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      <PageHeader
        eyebrow="Zero API Key AI Tutor"
        title="AI Voice Assistant & Engineering Mentor"
        description="Local, voice-enabled tutor powered by open-weights models and symbolic mathematics. Zero paid API keys required."
      />

      <div className="assistant-page-header-row">
        <Link to="/" className="assistant-page-back-link" aria-label="Go back to Dashboard">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="assistant-health-badge" title="Local AI Engine Status">
            <span className="assistant-health-dot" />
            <span>Local AI Active ({statusInfo?.activeModel || 'Zero API Keys'})</span>
          </div>
          <button
            type="button"
            className="assistant-exit-btn"
            onClick={handleCloseAssistant}
            aria-label="Close Assistant and exit"
            title="Exit Assistant"
          >
            <X size={16} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Six Learning Modes Bar */}
      <div className="assistant-mode-bar" role="tablist" aria-label="Select Learning Mode">
        {LEARNING_MODES.map((m) => {
          const Icon = m.icon
          const isActive = activeMode === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`assistant-mode-pill ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveMode(m.id)
                announce(`Switched to mode: ${m.label}`)
              }}
              title={m.desc}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* Academic Context Quick Selectors */}
      <div className="assistant-filters-bar" role="region" aria-label="Academic Context Filters">
        <select
          className="assistant-filter-select"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          aria-label="Engineering Branch"
        >
          <option value="">All Branches</option>
          <option value="Computer Science">Computer Science (CSE)</option>
          <option value="Information Technology">Information Technology (IT)</option>
          <option value="Computer Engineering">Computer Engineering</option>
          <option value="Mechanical Engineering">Mechanical Engineering</option>
          <option value="Electrical Engineering">Electrical Engineering</option>
          <option value="Electronics & Comm">Electronics & Comm (ECE)</option>
          <option value="Civil Engineering">Civil Engineering</option>
          <option value="AI & Data Science">AI & Data Science</option>
        </select>

        <select
          className="assistant-filter-select"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          aria-label="Semester"
        >
          <option value="">All Semesters</option>
          {Array.from({ length: 8 }, (_, i) => (
            <option key={i + 1} value={`Semester ${i + 1}`}>
              Semester {i + 1}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="assistant-filter-input"
          placeholder="Subject (e.g. Data Structures, Calculus, DBMS)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Filter by subject"
        />
      </div>

      {/* Main Chat Interface */}
      <div className="assistant-main-card">
        <div className="assistant-page-messages" role="log" aria-label="Conversation messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`assistant-chat-bubble ${msg.sender}`} tabIndex={0}>
              <div className="bubble-header">
                <span className="bubble-sender">
                  {msg.sender === 'user' ? profile.name || 'You' : 'Voice Mentor'}
                </span>
                {msg.mode && <span className="bubble-time">• {msg.mode}</span>}
                <span className="bubble-time">• {msg.timestamp}</span>
              </div>
              <div className="bubble-content" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>

              {/* Math Verification Proof Display */}
              {msg.math_verification && msg.math_verification.verified && (
                <div className="assistant-math-card">
                  <div className="assistant-math-header">
                    <CheckCircle2 size={16} />
                    <span>Symbolic Mathematics Verified (SymPy)</span>
                  </div>
                  <div>Expression: <code>{msg.math_verification.expression}</code></div>
                  <div className="assistant-math-result">
                    Result: {msg.math_verification.result}
                  </div>
                  {msg.math_verification.steps && (
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                      {msg.math_verification.steps.map((st, idx) => (
                        <li key={idx}>{st}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Sources Citation Display */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="assistant-sources-card">
                  <div className="assistant-sources-header">
                    <span>Cited Syllabus / Reference Materials ({msg.sources.length})</span>
                  </div>
                  {msg.sources.map((s, idx) => (
                    <div key={idx} className="assistant-source-item">
                      <strong>{s.title}</strong> {s.page_number ? `(Page ${s.page_number})` : ''}: {s.snippet}
                    </div>
                  ))}
                </div>
              )}

              {msg.action && (
                <div className="bubble-action">
                  {msg.action.type === 'NAVIGATE' && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleExecuteAction(msg.action!)}
                    >
                      <ArrowRight size={14} aria-hidden="true" />
                      <span>Go to {msg.action.label || msg.action.target}</span>
                    </button>
                  )}
                  {msg.action.type === 'CREATE_NOTE' && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleExecuteAction(msg.action!)}
                    >
                      <FilePlus size={14} aria-hidden="true" />
                      <span>Note Saved: {msg.action.title}</span>
                    </button>
                  )}
                  {msg.action.type === 'LOAD_QUIZ' && (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleExecuteAction(msg.action!)}
                    >
                      <Layers size={14} aria-hidden="true" />
                      <span>Start Practice Quiz</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="assistant-thinking-indicator" aria-label="Thinking">
              <span className="dot dot-1" />
              <span className="dot dot-2" />
              <span className="dot dot-3" />
              <span className="thinking-text">Voice Mentor is reasoning...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts for Active Mode */}
        <div className="assistant-sample-prompts" aria-label="Quick sample prompts">
          <span className="sample-label">Suggested in {activeMode}:</span>
          <div className="sample-chips-row">
            {QUICK_PROMPTS_BY_MODE[activeMode]?.map((prompt, i) => (
              <button
                key={i}
                type="button"
                className="sample-chip"
                onClick={() => void handleSendMessage(prompt)}
              >
                <Sparkles size={12} aria-hidden="true" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="assistant-page-input-bar">
          <button
            type="button"
            className={`assistant-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            aria-label={isListening ? 'Stop listening' : 'Start microphone'}
            title={isListening ? 'Listening (Click to stop)' : 'Click to talk (or press Space)'}
          >
            {isListening ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
          </button>

          <form
            className="assistant-input-wrapper"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSendMessage(inputText)
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="assistant-text-field"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask anything in ${activeMode}... (e.g. "Explain QuickSort", "Take me to notes")`}
              aria-label="Message for Voice Assistant"
            />
            <button
              type="submit"
              className="assistant-send-btn"
              disabled={!inputText.trim()}
              aria-label="Send message"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>

          {isSpeaking && (
            <button
              type="button"
              className="assistant-stop-audio-btn"
              onClick={stopAudioPlayback}
              aria-label="Stop audio narration (Shortcut: Escape)"
              title="Stop audio (Escape)"
            >
              <VolumeX size={16} aria-hidden="true" />
              <span>Stop Voice</span>
            </button>
          )}

          <button
            type="button"
            className={`tool-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            aria-label={voiceEnabled ? 'Mute speech output' : 'Enable speech output'}
            title={voiceEnabled ? 'Speech on' : 'Speech muted'}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            className="tool-btn"
            onClick={cycleSpeechRate}
            aria-label={`Speech rate: ${speechRate}x. Click to change`}
            title={`Speech rate: ${speechRate}x`}
          >
            {speechRate}x
          </button>

          <button
            type="button"
            className={`tool-btn ${handsFreeMode ? 'active' : ''}`}
            onClick={() => {
              const next = !handsFreeMode
              setHandsFreeMode(next)
              announce(next ? 'Hands-free auto-listening mode enabled.' : 'Hands-free mode disabled.')
            }}
            aria-label={handsFreeMode ? 'Hands-free mode active' : 'Turn on hands-free mode'}
            title="Hands-free auto-turn mode"
          >
            <Headphones size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
