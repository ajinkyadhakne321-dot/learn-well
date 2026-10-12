// Web Audio API synthesizer for accessible Earcons (audio feedback cues for blind users)

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null
    if (!audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        audioContext = new AudioCtx()
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {
        // Ignored if browser policy restricts auto-resume
      })
    }
    return audioContext
  } catch (err) {
    console.warn('Failed to initialize or resume AudioContext:', err)
    return null
  }
}

/**
 * Play a gentle rising chime when the assistant begins listening to user's voice
 */
export function playChimeListeningStart() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now) // A4
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12) // A5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch (err) {
    console.warn('playChimeListeningStart error:', err)
  }
}

/**
 * Play a short chime when speech recognition completes and assistant starts processing
 */
export function playChimeProcessing() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(659.25, now) // E5
    osc.frequency.setValueAtTime(880, now + 0.08) // A5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.18)
  } catch (err) {
    console.warn('playChimeProcessing error:', err)
  }
}

/**
 * Play a cheerful confirmation triad when an action succeeds (e.g. navigated, note saved)
 */
export function playChimeSuccess() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5 major triad

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteStart = now + index * 0.06

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(0.001, noteStart)
      gain.gain.linearRampToValueAtTime(0.1, noteStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.14)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + 0.15)
    })
  } catch (err) {
    console.warn('playChimeSuccess error:', err)
  }
}

/**
 * Play a soft gentle descending tone for cancel / stopped
 */
export function playChimeCancel() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now) // C5
    osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.15) // E4

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch (err) {
    console.warn('playChimeCancel error:', err)
  }
}

/**
 * Play a subtle low buzz tone for error or command not recognized
 */
export function playChimeError() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now) // A3
    osc.frequency.linearRampToValueAtTime(164.81, now + 0.15) // E3

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  } catch (err) {
    console.warn('playChimeError error:', err)
  }
}

/**
 * Play a delicate prompt chime when it's the student's turn to speak in hands-free mode
 */
export function playChimeTurnPrompt() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(659.25, now) // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08) // G5

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.15)
  } catch (err) {
    console.warn('playChimeTurnPrompt error:', err)
  }
}

/**
 * Play a bright chime when a study note is saved
 */
export function playChimeNoteSaved() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [698.46, 1046.5] // F5, C6 (bright perfect fifth)

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const noteStart = now + index * 0.07

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(0.001, noteStart)
      gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + 0.18)
    })
  } catch (err) {
    console.warn('playChimeNoteSaved error:', err)
  }
}
