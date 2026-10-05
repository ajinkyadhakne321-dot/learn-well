// Speech-to-Text and Text-to-Speech Services with Accessibility optimizations

export type SpeechRate = 1.0 | 1.25 | 1.5 | 1.75 | 2.0

export interface ISpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

export interface ISpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface IWindowSpeech extends Window {
  SpeechRecognition?: new () => ISpeechRecognition
  webkitSpeechRecognition?: new () => ISpeechRecognition
}

let activeUtterance: SpeechSynthesisUtterance | null = null

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  const win = window as unknown as IWindowSpeech
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition)
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Creates and initializes a SpeechRecognition instance with event handlers
 */
export function createSpeechRecognizer(callbacks: {
  onStart?: () => void
  onResult: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onEnd?: () => void
}): ISpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) {
    callbacks.onError?.('Speech recognition is not supported in this browser.')
    return null
  }

  const win = window as unknown as IWindowSpeech
  const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition
  if (!SpeechRecognitionClass) return null

  const recognition = new SpeechRecognitionClass()

  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    callbacks.onStart?.()
  }

  recognition.onresult = (event: ISpeechRecognitionEvent) => {
    let interimTranscript = ''
    let finalTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript
      } else {
        interimTranscript += event.results[i][0].transcript
      }
    }

    if (finalTranscript) {
      callbacks.onResult(finalTranscript.trim(), true)
    } else if (interimTranscript) {
      callbacks.onResult(interimTranscript.trim(), false)
    }
  }

  recognition.onerror = (event: { error: string }) => {
    console.warn('Speech recognition error:', event.error)
    callbacks.onError?.(event.error)
  }

  recognition.onend = () => {
    callbacks.onEnd?.()
  }

  return recognition
}

/**
 * Speak text aloud using SpeechSynthesis
 */
export function speakText(
  text: string,
  options: {
    rate?: SpeechRate
    pitch?: number
    onStart?: () => void
    onEnd?: () => void
    onError?: (err: unknown) => void
  } = {}
) {
  if (!isSpeechSynthesisSupported()) {
    options.onError?.('Speech synthesis not supported')
    return
  }

  // Cancel any currently speaking utterance (Barge-in capability)
  window.speechSynthesis.cancel()

  const cleanText = text.replace(/[*#_`]/g, '').trim()
  if (!cleanText) return

  const utterance = new SpeechSynthesisUtterance(cleanText)
  activeUtterance = utterance
  utterance.rate = options.rate ?? 1.2 // Default slightly faster for blind accessibility
  utterance.pitch = options.pitch ?? 1.0

  const voices = window.speechSynthesis.getVoices()
  const preferredVoice =
    voices.find((v) => /Google|Samantha|Daniel|Natural|Premium|Karen/i.test(v.name) && v.lang.startsWith('en')) ??
    voices.find((v) => v.lang.startsWith('en'))

  if (preferredVoice) {
    utterance.voice = preferredVoice
  }

  utterance.onstart = () => {
    options.onStart?.()
  }

  utterance.onend = () => {
    activeUtterance = null
    options.onEnd?.()
  }

  utterance.onerror = (e) => {
    activeUtterance = null
    options.onError?.(e)
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * Cancel any ongoing speech output instantly
 */
export function cancelSpeech() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel()
    activeUtterance = null
  }
}

/**
 * Check if the browser is currently speaking
 */
export function isCurrentlySpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false
  return window.speechSynthesis.speaking
}

export function getActiveUtterance(): SpeechSynthesisUtterance | null {
  return activeUtterance
}

