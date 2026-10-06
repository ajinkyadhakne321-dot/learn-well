import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Send,
  HelpCircle,
  Compass,
  FilePlus,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStudentWorkspace } from '../context/StudentWorkspaceState'
import {
  playChimeCancel,
  playChimeError,
  playChimeListeningStart,
  playChimeProcessing,
  playChimeSuccess,
} from '../services/soundEffects'
import {
  cancelSpeech,
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakText,
  type ISpeechRecognition,
  type SpeechRate,
} from '../services/speechService'
import { sendAssistantMessage, type AssistantAction } from '../services/assistantApi'

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  action?: AssistantAction
  timestamp: string
}

interface VoiceAssistantModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VoiceAssistantModal({ isOpen, onClose }: VoiceAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your LearnWell Voice Assistant. Press the microphone or say "Where am I?", "Go to Notes", or "Take a note". You can also press Alt+A to toggle voice, or Escape to stop audio.',
      timestamp: 'Ready',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1.25)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [announcement, setAnnouncement] = useState('')

  const location = useLocation()
  const navigate = useNavigate()
  const { notes, saveNote, preferences, updatePreferences, profile, setActiveQuiz } = useStudentWorkspace()

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const micButtonRef = useRef<HTMLButtonElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus mic button or input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setAnnouncement('Voice assistant opened. Press Space to speak or type a message.')
        micButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      stopListening()
      cancelSpeech()
    }
  }, [isOpen])

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      cancelSpeech()
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  function announce(text: string) {
    setAnnouncement(text)
  }

  function handleExecuteAction(action: AssistantAction) {
    if (!action) return

    playChimeSuccess()

    switch (action.type) {
      case 'NAVIGATE':
        if (action.target) {
          navigate(action.target)
          announce(`Navigated to ${action.label || action.target}`)
          // Close modal on navigation if user asked to go somewhere
          setTimeout(() => onClose(), 600)
        }
        break

      case 'LOAD_QUIZ':
        if (action.questions && action.questions.length > 0) {
          setActiveQuiz({
            subject: action.subject || 'Practice',
            title: action.title || 'Practice Quiz',
            questions: action.questions,
          })
          navigate('/quiz')
          announce(`Loaded quiz: ${action.title || 'Practice Quiz'}. Navigating to Quiz page.`)
          setTimeout(() => onClose(), 600)
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

    cancelSpeech()
    setInputText('')

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: trimmed,
      timestamp: 'Just now',
    }
    setMessages((prev) => [...prev, userMsg])
    setIsThinking(true)
    playChimeProcessing()
    announce('Processing your request...')

    try {
      const activeHeading = document.querySelector('h1')?.textContent || 'Dashboard'
      const activeSummary = document.querySelector('.feature-description, .page-header p')?.textContent || ''

      const res = await sendAssistantMessage(trimmed, {
        currentPath: location.pathname,
        pageTitle: activeHeading,
        pageSummary: activeSummary,
        studentName: profile.name,
        notesCount: notes.length,
        preferences: {
          highContrast: preferences.highContrast,
          textSize: preferences.textSize,
          underlineLinks: preferences.underlineLinks,
        },
      })

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-bot`,
        sender: 'assistant',
        text: res.spokenText,
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
          },
          onError: () => {
            setIsSpeaking(false)
            if (res.action) handleExecuteAction(res.action)
          },
        })
      } else if (res.action) {
        handleExecuteAction(res.action)
      }
    } catch {
      playChimeError()
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: 'Just now',
      }
      setMessages((prev) => [...prev, errorMsg])
      announce('Sorry, I had trouble processing that request.')
    } finally {
      setIsThinking(false)
    }
  }

  function startListening() {
    if (!isSpeechRecognitionSupported()) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    cancelSpeech()
    setIsSpeaking(false)

    try {
      playChimeListeningStart()
      announce('Listening for your voice. Speak your request.')

      const recognizer = createSpeechRecognizer({
        onStart: () => {
          setIsListening(true)
        },
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
          announce('Did not catch that. Please try again or type.')
        },
        onEnd: () => {
          setIsListening(false)
        },
      })

      if (recognizer) {
        recognitionRef.current = recognizer
        recognizer.start()
      }
    } catch (e) {
      console.error(e)
      setIsListening(false)
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignored
      }
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  function toggleListening() {
    if (isListening) {
      playChimeCancel()
      stopListening()
      announce('Microphone stopped.')
    } else {
      startListening()
    }
  }

  function stopAudioPlayback() {
    cancelSpeech()
    setIsSpeaking(false)
    playChimeCancel()
    announce('Audio playback stopped.')
  }

  if (!isOpen) return null

  return (
    <div
      className="assistant-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          stopAudioPlayback()
          onClose()
        }
      }}
    >
      {/* Invisible live region for screen readers */}
      <div className="visually-hidden" aria-live="assertive" role="status">
        {announcement}
      </div>

      <div className="assistant-modal">
        {/* Header */}
        <header className="assistant-header">
          <div className="assistant-header-info">
            <span className="assistant-icon-badge" aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 id="assistant-title">LearnWell Voice Assistant</h2>
              <p className="assistant-status-text">
                {isListening
                  ? 'Listening to you...'
                  : isThinking
                    ? 'Thinking...'
                    : isSpeaking
                      ? 'Speaking response...'
                      : 'Voice Co-pilot Ready'}
              </p>
            </div>
          </div>

          <div className="assistant-header-actions">
            {/* Speech rate control */}
            <div className="speech-rate-control">
              <label htmlFor="assistant-speed" className="visually-hidden">
                Voice Speed
              </label>
              <select
                id="assistant-speed"
                value={speechRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) as SpeechRate
                  setSpeechRate(val)
                  announce(`Voice rate set to ${val} times.`)
                }}
                title="Adjust speech rate"
                aria-label={`Speech rate: currently ${speechRate}x`}
              >
                <option value={1.0}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={1.75}>1.75x</option>
                <option value={2.0}>2.0x</option>
              </select>
            </div>

            {/* Mute speech output */}
            <button
              type="button"
              className={`icon-button ${!voiceEnabled ? 'is-muted' : ''}`}
              onClick={() => {
                const next = !voiceEnabled
                setVoiceEnabled(next)
                if (!next) cancelSpeech()
                announce(next ? 'Spoken audio enabled' : 'Spoken audio muted')
              }}
              aria-label={voiceEnabled ? 'Mute voice audio output' : 'Enable voice audio output'}
              title={voiceEnabled ? 'Mute speech output' : 'Enable speech output'}
            >
              {voiceEnabled ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
            </button>

            {/* Close modal */}
            <button
              type="button"
              className="icon-button close-assistant-btn"
              onClick={() => {
                stopAudioPlayback()
                onClose()
              }}
              aria-label="Close Voice Assistant (or press Escape)"
              title="Close (Escape)"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Conversation Thread */}
        <div className="assistant-conversation" role="log" aria-label="Conversation history">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`assistant-chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-assistant'}`}
            >
              <div className="bubble-content">
                <p>{msg.text}</p>
                {msg.action && (
                  <div className="bubble-action-tag">
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>
                      {msg.action.type === 'NAVIGATE' && `Navigating to ${msg.action.label || msg.action.target}`}
                      {msg.action.type === 'CREATE_NOTE' && `Note Created: ${msg.action.title}`}
                      {msg.action.type === 'SET_ACCESSIBILITY' && 'Accessibility updated'}
                      {msg.action.type === 'READ_ALOUD' && 'Reading aloud'}
                    </span>
                  </div>
                )}
              </div>
              <div className="bubble-meta">
                <span>{msg.sender === 'user' ? 'You' : 'Assistant'}</span>
                {msg.sender === 'assistant' && (
                  <button
                    type="button"
                    className="bubble-repeat-btn"
                    onClick={() => {
                      speakText(msg.text, { rate: speechRate })
                      announce(`Replaying: ${msg.text}`)
                    }}
                    aria-label={`Read message aloud: ${msg.text.slice(0, 30)}...`}
                  >
                    <Volume2 size={13} aria-hidden="true" /> Read
                  </button>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="assistant-thinking-indicator" role="status">
              <span className="dot dot-1" />
              <span className="dot dot-2" />
              <span className="dot dot-3" />
              <span className="visually-hidden">Assistant is processing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Voice Prompt Shortcuts */}
        <div className="assistant-quick-prompts" aria-label="Suggested voice commands">
          <p className="prompts-label">Try asking:</p>
          <div className="prompts-grid">
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Create a quiz on Software Engineering')}
            >
              <Sparkles size={14} aria-hidden="true" /> Quiz me: SE
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Quiz me on Python loops')}
            >
              <Sparkles size={14} aria-hidden="true" /> Quiz me: Python
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Where am I and what is on this page?')}
            >
              <Compass size={14} aria-hidden="true" /> Where am I?
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Read this page summary aloud')}
            >
              <BookOpen size={14} aria-hidden="true" /> Read page
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Take me to my notes')}
            >
              <Layers size={14} aria-hidden="true" /> Go to Notes
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('What upcoming assignments do I have?')}
            >
              <Calendar size={14} aria-hidden="true" /> Deadlines
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Take a note: Remember to review loops')}
            >
              <FilePlus size={14} aria-hidden="true" /> Take note
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Toggle high contrast mode')}
            >
              <HelpCircle size={14} aria-hidden="true" /> High contrast
            </button>
          </div>
        </div>

        {/* Interactive Voice & Text Input Bar */}
        <footer className="assistant-input-footer">
          <form
            className="assistant-input-form"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSendMessage(inputText)
            }}
          >
            {/* Primary Mic Button */}
            <button
              ref={micButtonRef}
              type="button"
              className={`assistant-mic-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggleListening}
              aria-label={
                isListening
                  ? 'Stop listening'
                  : 'Start voice recording. Speak now or press Space.'
              }
              title="Toggle microphone (Alt+A)"
            >
              {isListening ? (
                <>
                  <span className="mic-pulse" aria-hidden="true" />
                  <MicOff size={24} aria-hidden="true" />
                </>
              ) : (
                <Mic size={24} aria-hidden="true" />
              )}
            </button>

            {/* Accessible Text Input */}
            <div className="assistant-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="assistant-text-field"
                placeholder={isListening ? 'Listening to your voice...' : 'Speak or type a question...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                aria-label="Ask the AI Assistant by typing or speaking"
              />
              {inputText.trim() && (
                <button
                  type="submit"
                  className="assistant-send-btn"
                  aria-label="Send message"
                  title="Send"
                >
                  <Send size={18} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Stop speech button if speaking */}
            {isSpeaking && (
              <button
                type="button"
                className="assistant-stop-audio-btn"
                onClick={stopAudioPlayback}
                aria-label="Stop audio speech playback"
                title="Stop speech"
              >
                <VolumeX size={18} aria-hidden="true" /> Stop
              </button>
            )}
          </form>

          <div className="assistant-footer-hints">
            <span><kbd>Alt</kbd> + <kbd>A</kbd> to talk</span>
            <span><kbd>Esc</kbd> to stop audio</span>
            <span>Compatible with JAWS, NVDA & VoiceOver</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
