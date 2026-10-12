import assert from 'node:assert'
import {
  processAssistantMessage,
  resolveConversationContext,
  validateAssistantResponse,
} from '../services/aiAssistantService.js'
import { searchSyllabus } from '../services/syllabusKnowledgeService.js'
import { normalizeTextForSpeech } from '../../../src/services/speechService.js'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`  PASS: ${name}`)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error: errorMsg })
    console.error(`  FAIL: ${name}\n        ${errorMsg}`)
  }
}

async function main() {
  console.log('\n======================================================')
  console.log('🧪 RUNNING AI ASSISTANT QUALITY & ACCESSIBILITY TESTS')
  console.log('======================================================\n')

  // --- 1. Array vs Linked List ---
  await runTest('1. Explain the difference between an array and a linked list', async () => {
    const res = await processAssistantMessage('Explain the difference between an array and a linked list')
    const text = res.spokenText.toLowerCase()

    assert(text.includes('array'), 'Response must discuss arrays')
    assert(text.includes('linked list'), 'Response must discuss linked lists')
    assert(
      text.includes('contiguous') || text.includes('memory') || text.includes('pointer'),
      'Response must explain fundamental memory differences'
    )
    assert(!text.includes('doubly linked list on page'), 'Must not return doubly linked list alone')
    assert(!text.includes('difference between attribute and variable'), 'Must not return statistics notes')
    assert.strictEqual(res.action, undefined, 'Academic question must NOT trigger a NAVIGATE action')
  })

  // --- 2. C Program Even or Odd ---
  await runTest('2. Write a C program to check whether a number is even or odd', async () => {
    const res = await processAssistantMessage('Write a C program to check whether a number is even or odd')
    const text = res.spokenText.toLowerCase()

    assert(text.includes('#include') || text.includes('modulo') || text.includes('% 2'), 'Must include C program logic')
    assert(text.includes('even') && text.includes('odd'), 'Must address even and odd')
    assert(!text.includes('magic number'), 'Must NOT return explanation of magic numbers')
    assert(!text.includes('median ='), 'Must NOT return median formula from statistics')
    assert.strictEqual(res.action, undefined, 'Code generation must not trigger platform navigation')
  })

  // --- 3. Binary Search Sorted Array Requirement ---
  await runTest('3. Why does binary search require a sorted array?', async () => {
    const res = await processAssistantMessage('Why does binary search require a sorted array?')
    const text = res.spokenText.toLowerCase()

    assert(text.includes('binary search'), 'Must discuss binary search')
    assert(text.includes('sorted'), 'Must explain sorted requirement')
    assert(
      text.includes('middle') || text.includes('half') || text.includes('divide and conquer'),
      'Must explain eliminating half the search space'
    )
    assert(!text.includes('insertion sort'), 'Must NOT return explanation of insertion sort')
    assert(!text.includes('online shopping system'), 'Must NOT return software requirements shopping cart')
    assert.strictEqual(res.action, undefined, 'Explanation must not trigger navigation')
  })

  // --- 4. For Loop Step by Step ---
  await runTest('4. Explain how a for loop works, one step at a time', async () => {
    const res = await processAssistantMessage('Explain how a for loop works, one step at a time')
    const text = res.spokenText.toLowerCase()

    assert(text.includes('loop'), 'Must discuss loops')
    assert(
      text.includes('step 1') || text.includes('initialization') || text.includes('condition'),
      'Must break down sequential steps'
    )
    assert(
      !text.startsWith('an algorithm is a finite, well-defined sequence'),
      'Must NOT return generic algorithm definition'
    )
    assert.strictEqual(res.action, undefined, 'Step-by-step loop explanation must not trigger navigation')
  })

  // --- 5. Inheritance in OOP ---
  await runTest('5. Explain inheritance in OOP', async () => {
    const res = await processAssistantMessage('Explain inheritance in OOP')
    const text = res.spokenText.toLowerCase()

    assert(text.includes('inheritance'), 'Must discuss inheritance')
    assert(
      (text.includes('parent') && text.includes('child')) ||
      (text.includes('base') && text.includes('derived')) ||
      text.includes('class'),
      'Must explain OOP class hierarchy'
    )
    assert.strictEqual(res.action, undefined, 'OOP explanation must not trigger navigation')
  })

  // --- 6. Follow-up: Real-Life Example of It ---
  await runTest('6. Follow-up: Can you give me a real-life example of it?', async () => {
    const history = [
      { role: 'user' as const, text: 'Explain inheritance in OOP' },
      {
        role: 'assistant' as const,
        text: 'Inheritance allows a child class to inherit properties and methods from a parent class.',
      },
    ]

    const resolved = resolveConversationContext('Can you give me a real-life example of it?', history)
    assert(
      resolved.resolvedQuery.toLowerCase().includes('inheritance'),
      `Context resolution must replace "it" with "inheritance" (got "${resolved.resolvedQuery}")`
    )

    const res = await processAssistantMessage('Can you give me a real-life example of it?', { history })
    const text = res.spokenText.toLowerCase()

    assert(
      text.includes('vehicle') || text.includes('car') || text.includes('animal') || text.includes('parent'),
      'Must provide a real-life analogy for inheritance'
    )
    assert(
      !text.includes('television') && !text.includes('tv series') && !text.includes('miniseries'),
      'Must NOT return information about a television show'
    )
    assert.strictEqual(res.action, undefined, 'Analogy must not trigger navigation')
  })

  // --- 7. OSI Model in Simple Language ---
  await runTest('7. Explain the OSI model in simple language', async () => {
    const res = await processAssistantMessage('Explain the OSI model in simple language')
    const text = res.spokenText.toLowerCase()

    assert(
      text.includes('osi') || text.includes('open systems interconnection'),
      'Must explain the OSI model'
    )
    assert(
      text.includes('7') || text.includes('seven') || text.includes('layer'),
      'Must discuss the network layers'
    )
    assert(
      !text.includes('rock band') && !text.includes('progressive metal') && !text.includes('album'),
      'Must NOT return information about the music band OSI'
    )
    assert.strictEqual(res.action, undefined, 'OSI model explanation must not trigger navigation')
  })

  // --- 8. Assistant Uncertainty Policy ---
  await runTest('8. If you do not know the answer to a BCA question, how should you respond?', async () => {
    const res = await processAssistantMessage('If you do not know the answer to a BCA question, how should you respond?')
    const text = res.spokenText.toLowerCase()

    assert(
      text.includes('do not know') || text.includes('honestly') || text.includes('uncertain') || text.includes('not have enough'),
      'Must state that it will honestly admit uncertainty'
    )
    assert(
      text.includes('textbook') || text.includes('syllabus') || text.includes('instructor'),
      'Must recommend consulting verified academic sources'
    )
    assert(
      !text.includes('respond within 2 seconds'),
      'Must NOT return software requirements performance metrics'
    )
    assert.strictEqual(res.action, undefined, 'Policy answer must not trigger navigation')
  })

  // --- 9. Application Action Separation ---
  await runTest('9. Application actions remain distinct from academic answers', async () => {
    const navNotes = await processAssistantMessage('Take me to my notes')
    assert.strictEqual(navNotes.action?.type, 'NAVIGATE')
    if (navNotes.action?.type === 'NAVIGATE') {
      assert.strictEqual(navNotes.action.target, '/notes')
    }

    const navQuiz = await processAssistantMessage('Open the quiz page')
    assert.strictEqual(navQuiz.action?.type, 'NAVIGATE')
    if (navQuiz.action?.type === 'NAVIGATE') {
      assert.strictEqual(navQuiz.action.target, '/quiz')
    }

    const saveNote = await processAssistantMessage('Save that to my notes', {
      history: [
        { role: 'user', text: 'Explain binary search' },
        { role: 'assistant', text: 'Binary search is an efficient algorithm with O(log n) time.' },
      ],
    })
    assert.strictEqual(saveNote.action?.type, 'CREATE_NOTE')
    if (saveNote.action?.type === 'CREATE_NOTE') {
      assert.strictEqual(saveNote.action.subject, 'General Study')
    }

    const contrast = await processAssistantMessage('Toggle high contrast mode')
    assert.strictEqual(contrast.action?.type, 'SET_ACCESSIBILITY')
    if (contrast.action?.type === 'SET_ACCESSIBILITY') {
      assert.strictEqual(contrast.action.highContrast, true)
    }
  })

  // --- 10. Retrieval Over-matching Prevention ---
  await runTest('10. Document retrieval does not match stop words or off-topic queries', () => {
    const queries = [
      'Explain the difference between an array and a linked list',
      'Write a C program to check whether a number is even or odd',
      'Why does binary search require a sorted array?',
      'Explain how a for loop works, one step at a time',
      'Can you give me a real-life example of it?',
      'Explain the OSI model',
      'If you do not know a BCA answer, how should you respond?',
    ]

    for (const q of queries) {
      const matches = searchSyllabus(q)
      assert.strictEqual(
        matches.length,
        0,
        `Query "${q}" should not match unrelated course documents (matched ${matches.length})`
      )
    }

    // Verify valid syllabus queries still match
    const validMatches = searchSyllabus('What is in unit 1 of statistics?')
    assert(validMatches.length > 0, 'Legitimate statistics query must match statistics document')
  })

  // --- 11. Response Quality Validation Filter ---
  await runTest('11. Response validation detects off-topic answers and passes valid answers', () => {
    // Bad C program response with magic numbers
    const badCProg = validateAssistantResponse(
      'Write a C program to check whether a number is even or odd',
      'Write a C program to check whether a number is even or odd',
      { spokenText: 'A magic number in programming is a unique value with unexplained meaning.', provider: 'gemini' }
    )
    assert.strictEqual(badCProg.valid, false, 'Validator must reject off-topic magic numbers for C program')

    // Good C program response
    const goodCProg = validateAssistantResponse(
      'Write a C program to check whether a number is even or odd',
      'Write a C program to check whether a number is even or odd',
      { spokenText: 'In C, check if num % 2 == 0 using the modulo operator to determine even or odd.', provider: 'gemini' }
    )
    assert.strictEqual(goodCProg.valid, true, 'Validator must accept proper C program answer')

    // Bad OSI response with music band
    const badOsi = validateAssistantResponse(
      'Explain the OSI model in simple language',
      'Explain the OSI model in simple language',
      { spokenText: 'OSI is an American progressive metal band formed in 2002.', provider: 'gemini' }
    )
    assert.strictEqual(badOsi.valid, false, 'Validator must reject music band for OSI model')

    // Good OSI response
    const goodOsi = validateAssistantResponse(
      'Explain the OSI model in simple language',
      'Explain the OSI model in simple language',
      { spokenText: 'The OSI model has 7 networking layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.', provider: 'gemini' }
    )
    assert.strictEqual(goodOsi.valid, true, 'Validator must accept proper OSI model answer')
  })

  // --- 12. Accessibility & Speech Normalization ---
  await runTest('12. Speech normalization renders C code and symbols clearly for audio/screen readers', () => {
    const raw = '#include <stdio.h>\nint main() {\n  if (num % 2 == 0) {\n    printf("%d is even", num);\n  }\n}'
    const normalized = normalizeTextForSpeech(raw)

    assert(!normalized.includes('<stdio.h>'), 'Angle brackets must be removed for speech')
    assert(normalized.includes('include header stdio.h') || normalized.includes('stdio.h'), 'Include statement must be phonetic')
    assert(normalized.includes('print f'), 'printf must be spoken as print f')
    assert(normalized.includes('modulo'), 'Percent sign must be spoken as modulo')
    assert(normalized.includes('is equal to') || normalized.includes('equals'), '== must be spoken as is equal to')
  })

  // --- 13. Voice Assistant Close Intents ---
  await runTest('13. Close intents correctly trigger CLOSE action for tab/modal queries', async () => {
    const closeQueries = [
      'close the ai voice assistant tab',
      'close the voice assistant tab',
      'close ai voice assistant',
      'close assistant',
      'close tab',
      'close the tab',
      'exit',
      'dismiss',
    ]

    for (const q of closeQueries) {
      const res = await processAssistantMessage(q)
      assert.strictEqual(
        res.action?.type,
        'CLOSE',
        `Query "${q}" must trigger CLOSE action, got: ${JSON.stringify(res.action)}`
      )
      assert(
        res.spokenText.toLowerCase().includes('closing'),
        `Query "${q}" must confirm closing, got: "${res.spokenText}"`
      )
    }
  })

  console.log('\n======================================================')
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = total - passed

  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('======================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
