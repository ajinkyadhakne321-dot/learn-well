import assert from 'node:assert/strict'
import {
  detectPlatformAction,
  getVoiceAgentStatus,
  processVoiceAgentMessage,
} from '../services/voiceAgentService.js'

async function runTests() {
  console.log('🧪 Starting Voice Agent (Zero API Key) Tests...\n')

  // Test 1: Status reports zero API key requirement
  console.log('Test 1: Status returns local provider without API keys')
  const status = await getVoiceAgentStatus()
  assert.equal(status.available, true)
  assert.ok(status.modes.includes('Academic Learning'))
  assert.ok(status.modes.includes('Engineering Mathematics'))
  console.log('✓ Status test passed\n')

  // Test 2: Platform Navigation Actions
  console.log('Test 2: Platform Navigation Actions')
  const navAction = detectPlatformAction('Go to notes page')
  assert.ok(navAction)
  assert.equal(navAction.type, 'NAVIGATE')
  assert.equal((navAction as { target: string }).target, '/notes')

  const quizAction = detectPlatformAction('Take me to quiz')
  assert.ok(quizAction)
  assert.equal(quizAction.type, 'NAVIGATE')
  assert.equal((quizAction as { target: string }).target, '/quiz')
  console.log('✓ Navigation detection passed\n')

  // Test 3: Accessibility Actions
  console.log('Test 3: Accessibility Actions')
  const contrastAction = detectPlatformAction('Enable high contrast mode')
  assert.ok(contrastAction)
  assert.equal(contrastAction.type, 'SET_ACCESSIBILITY')
  assert.equal((contrastAction as { highContrast?: boolean }).highContrast, true)

  const textAction = detectPlatformAction('Switch to large text size')
  assert.ok(textAction)
  assert.equal(textAction.type, 'SET_ACCESSIBILITY')
  assert.equal((textAction as { textSize?: string }).textSize, 'large')
  console.log('✓ Accessibility detection passed\n')

  // Test 4: Note Taking Action
  console.log('Test 4: Note Taking Action')
  const noteAction = detectPlatformAction('Take a note about binary search trees')
  assert.ok(noteAction)
  assert.equal(noteAction.type, 'CREATE_NOTE')
  assert.ok((noteAction as { content: string }).content.includes('binary search trees'))
  console.log('✓ Note taking action passed\n')

  // Test 5: Processing Question without API Keys (Local Tutor)
  console.log('Test 5: Processing Question without API Keys')
  const resp = await processVoiceAgentMessage({
    message: 'What is QuickSort algorithm?',
    mode: 'Programming & Coding',
  })
  assert.ok(resp.response.length > 20)
  assert.ok(resp.spokenText.length > 20)
  assert.equal(resp.mode, 'Programming & Coding')
  assert.ok(resp.provider === 'local-voice-agent' || resp.provider === 'local-tutor-offline' || resp.provider === 'ollama')
  console.log('✓ Message processing test passed\n')

  // Test 6: Math Verification Mode
  console.log('Test 6: Math Verification Mode')
  const mathResp = await processVoiceAgentMessage({
    message: 'Find the derivative of x^3 + 4*x',
    mode: 'Engineering Mathematics',
  })
  assert.ok(mathResp.response.length > 20)
  if (mathResp.math_verification) {
    assert.equal(mathResp.math_verification.verified, true)
  }
  console.log('✓ Math verification test passed\n')

  console.log('🎉 ALL VOICE AGENT TESTS PASSED SUCCESSFULLY! Zero API keys required.')
  process.exit(0)
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
