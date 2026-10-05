import { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  FilePlus,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
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
import {
  fetchAssistantStatus,
  sendAssistantMessage,
  type AssistantAction,
} from '../services/assistantApi'

export function AssistantPage() {
  const [messages, setMessages] = useState<
    Array<{ id: string; sender: 'user' | 'assistant'; text: string; action?: AssistantAction; timestamp: string }>
  >([
    {
      id: 'init-1',
      sender: 'assistant',
      text: 'Welcome to your Voice Assistant! I can help you navigate subjects, read lessons aloud, check upcoming deadlines, take voice notes, and answer academic questions.',
      timestamp: 'Ready',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1.25)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [statusInfo, setStatusInfo] = useState<{ available: boolean; geminiEnabled: boolean } | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const location = useLocation()
  const navigate = useNavigate()
  const { notes, saveNote, preferences, updatePreferences, profile } = useStudentWorkspace()

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAssistantStatus()
      .then((data) => setStatusInfo(data))
      .catch(() => setStatusInfo({ available: true, geminiEnabled: false }))
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
          announce(`Navigating to ${action.label || action.target}`)
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
          announce(`Created note: ${action.title}`)
        }
        break

      case 'SET_ACCESSIBILITY': {
        const next = { ...preferences }
        if (action.highContrast !== undefined) next.highContrast = action.highContrast
        if (action.textSize) next.textSize = action.textSize
        if (action.underlineLinks !== undefined) next.underlineLinks = action.underlineLinks
        if (action.strongerFocus !== undefined) next.strongerFocus = action.strongerFocus
        updatePreferences(next)
        announce('Updated accessibility settings.')
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

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'user' as const,
      text: trimmed,
      timestamp: 'Just now',
    }
    setMessages((prev) => [...prev, userMsg])
    setIsThinking(true)
    playChimeProcessing()
    announce('Processing your request...')

    try {
      const res = await sendAssistantMessage(trimmed, {
        currentPath: location.pathname,
        pageTitle: 'Voice Assistant Hub',
        studentName: profile.name,
        notesCount: notes.length,
        preferences: {
          highContrast: preferences.highContrast,
          textSize: preferences.textSize,
          underlineLinks: preferences.underlineLinks,
        },
      })

      const botMsg = {
        id: `msg-${Date.now()}-bot`,
        sender: 'assistant' as const,
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
      const errorMsg = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant' as const,
        text: 'Sorry, I had trouble processing that request. Please try again.',
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
          announce('Did not understand audio. Please try again.')
        },
        onEnd: () => setIsListening(false),
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
    announce('Voice playback stopped.')
  }

  return (
    <div className="feature-page assistant-page-container">
      {/* Screen Reader Announcements */}
      <div className="visually-hidden" aria-live="assertive" role="status">
        {announcement}
      </div>

      <PageHeader
        eyebrow="VOICE & COGNITIVE ACCESSIBILITY"
        title="AI Voice Assistant"
        description="A voice-first co-pilot for blind and low-vision students. Navigate the platform, listen to lesson explanations, check deadlines, and capture audio notes hands-free."
      />

      {/* Status Bar */}
      <div className="assistant-status-banner">
        <div className="status-item">
          <span className="status-dot active" aria-hidden="true" />
          <span>Speech Engine: <strong>Web Speech Audio + Earcons</strong></span>
        </div>
        <div className="status-item">
          <span className={`status-dot ${statusInfo?.geminiEnabled ? 'active' : 'info'}`} aria-hidden="true" />
          <span>
            Intelligence Mode:{' '}
            <strong>{statusInfo?.geminiEnabled ? 'Google Gemini 1.5 Flash' : 'Built-in Accessibility NLU'}</strong>
          </span>
        </div>
        <div className="status-item speed-selector-wrapper">
          <label htmlFor="page-speech-rate">Reading Speed:</label>
          <select
            id="page-speech-rate"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value) as SpeechRate)}
            aria-label="Adjust assistant reading speed"
          >
            <option value={1.0}>1.0x (Standard)</option>
            <option value={1.25}>1.25x (Recommended)</option>
            <option value={1.5}>1.5x (Fast)</option>
            <option value={1.75}>1.75x (Rapid)</option>
            <option value={2.0}>2.0x (Screen Reader Pro)</option>
          </select>
        </div>
      </div>

      {/* Main Conversation Layout */}
      <div className="assistant-main-card">
        {/* Messages feed */}
        <div className="assistant-page-messages" role="log" aria-label="Conversation log">
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
                      {msg.action.type === 'NAVIGATE' && `Navigated to ${msg.action.label || msg.action.target}`}
                      {msg.action.type === 'CREATE_NOTE' && `Note Saved: ${msg.action.title}`}
                      {msg.action.type === 'SET_ACCESSIBILITY' && 'Accessibility settings applied'}
                      {msg.action.type === 'READ_ALOUD' && 'Spoken lesson narration'}
                    </span>
                  </div>
                )}
              </div>
              <div className="bubble-meta">
                <span>{msg.sender === 'user' ? 'Student' : 'LearnWell Assistant'}</span>
                {msg.sender === 'assistant' && (
                  <button
                    type="button"
                    className="bubble-repeat-btn"
                    onClick={() => speakText(msg.text, { rate: speechRate })}
                    aria-label={`Listen again to: ${msg.text.slice(0, 30)}`}
                  >
                    <Volume2 size={13} aria-hidden="true" /> Listen again
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
              <span className="visually-hidden">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Voice Prompts */}
        <div className="assistant-sample-prompts">
          <p className="prompts-label">Try speaking or clicking these commands:</p>
          <div className="prompts-grid">
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Explain loops in Python')}
            >
              <BookOpen size={14} aria-hidden="true" /> "Explain Python loops"
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Take me to my notes')}
            >
              <Layers size={14} aria-hidden="true" /> "Go to my notes"
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('What assignments are due this week?')}
            >
              <Calendar size={14} aria-hidden="true" /> "Upcoming deadlines"
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Take a note: Review linear regression for upcoming quiz')}
            >
              <FilePlus size={14} aria-hidden="true" /> "Take a note about ML"
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('Turn on high contrast')}
            >
              <HelpCircle size={14} aria-hidden="true" /> "Enable high contrast"
            </button>
            <button
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage('What is an algorithm?')}
            >
              <Sparkles size={14} aria-hidden="true" /> "What is an algorithm?"
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="assistant-page-input-bar">
          <form
            className="assistant-input-form"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSendMessage(inputText)
            }}
          >
            <button
              type="button"
              className={`assistant-mic-btn ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
              onClick={toggleListening}
              aria-label={isListening ? 'Stop listening' : 'Start voice recognition. Press Space or Alt+A.'}
              title="Toggle Microphone (Alt+A)"
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

            <div className="assistant-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="assistant-text-field"
                placeholder={isListening ? 'Listening to your voice...' : 'Speak or type your request...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                aria-label="Input field for voice assistant commands"
              />
              {inputText.trim() && (
                <button type="submit" className="assistant-send-btn" aria-label="Send query">
                  <Send size={18} aria-hidden="true" />
                </button>
              )}
            </div>

            {isSpeaking && (
              <button
                type="button"
                className="assistant-stop-audio-btn"
                onClick={stopAudioPlayback}
                aria-label="Stop audio speech playback (or press Escape)"
              >
                <VolumeX size={18} aria-hidden="true" /> Stop Audio
              </button>
            )}

            <button
              type="button"
              className={`icon-button ${!voiceEnabled ? 'is-muted' : ''}`}
              onClick={() => {
                const next = !voiceEnabled
                setVoiceEnabled(next)
                if (!next) cancelSpeech()
                announce(next ? 'Speech enabled' : 'Speech muted')
              }}
              aria-label={voiceEnabled ? 'Mute speech' : 'Enable speech'}
              title={voiceEnabled ? 'Mute speech' : 'Enable speech'}
            >
              {voiceEnabled ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
            </button>
          </form>
        </div>
      </div>

      {/* Blind Student Guidance Section */}
      <section className="feature-section" aria-labelledby="assistant-shortcuts-heading">
        <div className="feature-section-heading">
          <h2 id="assistant-shortcuts-heading">Accessibility & Keyboard Shortcuts</h2>
          <span className="sample-label">AUDIO FIRST</span>
        </div>
        <div className="shortcuts-grid">
          <div className="shortcut-card">
            <h3><kbd>Alt</kbd> + <kbd>A</kbd></h3>
            <p>Opens the floating voice assistant drawer from any page and starts listening immediately.</p>
          </div>
          <div className="shortcut-card">
            <h3><kbd>Escape</kbd></h3>
            <p>Instantly interrupts and stops speech playback (Barge-in) and closes the modal.</p>
          </div>
          <div className="shortcut-card">
            <h3><kbd>Space</kbd></h3>
            <p>Activates the microphone when the microphone button is in keyboard focus.</p>
          </div>
          <div className="shortcut-card">
            <h3>Audio Earcons</h3>
            <p>Harmonic chimes indicate listening start, query processing, and action completion without visual cues.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
