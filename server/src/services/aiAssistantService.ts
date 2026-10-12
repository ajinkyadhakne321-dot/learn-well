import { GoogleGenerativeAI } from '@google/generative-ai'
import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { searchSyllabus, buildOfflineSyllabusAnswer, type SyllabusMatch } from './syllabusKnowledgeService.js'
import { generateQuizForSubject, type GeneratedQuizQuestion } from './quizGeneratorService.js'
import { answerUniversalQuestion, matchBcaCurriculum } from './universalKnowledgeService.js'

export type AssistantAction =
  | { type: 'NAVIGATE'; target: string; label: string }
  | { type: 'CREATE_NOTE'; title: string; content: string; subject: string }
  | { type: 'SET_ACCESSIBILITY'; highContrast?: boolean; textSize?: 'default' | 'large' | 'extra-large'; underlineLinks?: boolean; strongerFocus?: boolean }
  | { type: 'READ_ALOUD'; text: string }
  | { type: 'ANSWER_QUIZ'; answerIndex: number; explanation: string }
  | { type: 'SPEAK'; text: string }
  | {
      type: 'LOAD_QUIZ'
      subject: string
      title: string
      questions: GeneratedQuizQuestion[]
    }
  | { type: 'CLOSE'; target?: string; label?: string }

export interface AssistantResponse {
  spokenText: string
  action?: AssistantAction
  provider: 'gemini' | 'offline-agent'
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'model'
  text: string
}

export interface AssistantContext {
  currentPath?: string
  pageTitle?: string
  pageSummary?: string
  studentName?: string
  notesCount?: number
  pendingAssignmentsCount?: number
  preferences?: {
    highContrast?: boolean
    textSize?: string
    underlineLinks?: boolean
  }
  history?: ChatHistoryItem[]
}

const SYSTEM_PROMPT = `You are "LearnWell Voice Assistant", an expert AI academic tutor and platform co-pilot designed for Bachelor of Computer Applications (BCA) and IT students, including students who are blind or visually impaired.

Core Guidelines:
1. Exact Answers: Answer the student's exact question directly, accurately, and thoroughly. Never return unrelated encyclopedia entries, music bands, television shows, or disconnected syllabus text.
2. Programming Requests: When a student asks for code (e.g. C, Python, Java, SQL), always provide the working, syntactically correct code in the requested language along with a clear, student-friendly explanation of how the logic works.
3. Comparative Questions: When comparing concepts (e.g. Array vs Linked List, Stack vs Queue), clearly compare them across fundamental dimensions: memory layout, sizing, access speed, and insertion/deletion efficiency.
4. Step-by-Step Breakdowns: When asked how a construct works (e.g. a for loop, binary search), explain the process sequentially step by step (e.g. Step 1: Initialization, Step 2: Condition check, Step 3: Body execution, Step 4: Increment/update).
5. Conversational Context: Follow-up questions (such as "Can you give me a real-life example of it?" or "Show code for that") must use the recent conversation history to identify the topic being discussed.
6. Admitting Uncertainty: If you do not know the answer to a question or lack sufficient context, state honestly: "I do not have enough verified information to answer that question accurately." Never guess or fabricate answers; encourage the student to consult their course textbook or instructor.
7. Spoken Audio Output: Blind students listen via speech synthesis. Spoken text should be clear, natural, and pleasant. Avoid raw ASCII diagrams or unreadable character strings.
8. Application Actions Separation:
   - ONLY return a NAVIGATE action if the student explicitly asks to navigate, open, or view a page or lesson. Academic questions must NOT navigate the student away.
   - DO NOT automatically append questions asking if the student wants to save notes.

Respond with valid JSON matching:
{
  "spokenText": "Clear, student-friendly academic answer or verbal confirmation",
  "action": null | { "type": "NAVIGATE" | "CREATE_NOTE" | "SET_ACCESSIBILITY" | "READ_ALOUD" | "LOAD_QUIZ", ... }
}`

/**
 * Resolves pronouns and coreferences from conversation history
 */
export function resolveConversationContext(
  query: string,
  history?: ChatHistoryItem[]
): { resolvedQuery: string; detectedTopic?: string } {
  const trimmed = query.trim()
  if (!history || history.length === 0) {
    return { resolvedQuery: trimmed }
  }

  // Check if current query contains referential pronouns or phrases
  const hasPronounRef =
    /\b(it|this|that|its|these|those)\b/i.test(trimmed) ||
    /\b(real\s*life\s*example|example\s+of\s+it|practical\s+example|elaborate|why\s+is\s+that|how\s+does\s+it\s+work|show\s+code\s+for\s+that)\b/i.test(trimmed)

  if (!hasPronounRef) {
    return { resolvedQuery: trimmed }
  }

  // Look backwards for the most recent user turn that established a topic
  const recentUserTurns = history
    .slice()
    .reverse()
    .filter((h) => h.role === 'user' && h.text.trim().length > 0)

  let extractedTopic = ''
  for (const turn of recentUserTurns) {
    const text = turn.text.trim()
    // Skip turns that themselves are pronouns or navigation commands
    if (/^(where am i|go to|take me to|open|save note|high contrast)/i.test(text)) continue

    const candidate = text
      .replace(/^(who is|who was|what is|what are|explain|describe|define|tell me about|how does|why does)\s+/i, '')
      .replace(/[?.!;,]+$/g, '')
      .trim()

    if (candidate.length > 2 && !/\b(it|this|that)\b/i.test(candidate)) {
      extractedTopic = candidate
      break
    }
  }

  // If no user topic found, check assistant turns
  if (!extractedTopic) {
    const recentAssistantTurns = history
      .slice()
      .reverse()
      .filter((h) => (h.role === 'assistant' || h.role === 'model') && h.text.trim().length > 0)

    for (const turn of recentAssistantTurns) {
      if (turn.text.toLowerCase().includes('inheritance')) {
        extractedTopic = 'inheritance in OOP'
        break
      } else if (turn.text.toLowerCase().includes('array') && turn.text.toLowerCase().includes('linked list')) {
        extractedTopic = 'arrays and linked lists'
        break
      } else if (turn.text.toLowerCase().includes('binary search')) {
        extractedTopic = 'binary search'
        break
      } else if (turn.text.toLowerCase().includes('for loop')) {
        extractedTopic = 'for loops'
        break
      } else if (turn.text.toLowerCase().includes('osi model')) {
        extractedTopic = 'the OSI model'
        break
      }
    }
  }

  if (extractedTopic) {
    // Replace pronouns with the explicit topic
    const resolved = trimmed
      .replace(/\bof\s+it\b/gi, `of ${extractedTopic}`)
      .replace(/\bof\s+that\b/gi, `of ${extractedTopic}`)
      .replace(/\bof\s+this\b/gi, `of ${extractedTopic}`)
      .replace(/\bhow\s+does\s+it\s+work\b/gi, `how does ${extractedTopic} work`)
      .replace(/\bwhy\s+is\s+it\b/gi, `why is ${extractedTopic}`)

    return {
      resolvedQuery: resolved !== trimmed ? resolved : `${trimmed} (${extractedTopic})`,
      detectedTopic: extractedTopic,
    }
  }

  return { resolvedQuery: trimmed }
}

/**
 * Validates the quality and topical relevance of a generated response
 */
export function validateAssistantResponse(
  originalQuery: string,
  resolvedQuery: string,
  response: AssistantResponse
): { valid: boolean; reason?: string } {
  const queryLower = `${originalQuery} ${resolvedQuery}`.toLowerCase()
  const responseLower = (response.spokenText || '').toLowerCase()

  if (!response.spokenText || response.spokenText.trim().length < 10) {
    return { valid: false, reason: 'EMPTY_OR_TOO_SHORT' }
  }

  // 1. Check C programming request
  const isCProgRequest =
    /\b(c\s+program|program\s+in\s+c|code\s+in\s+c)\b/i.test(queryLower) &&
    /\b(even\s+or\s+odd|even\s+and\s+odd|check\s+even)\b/i.test(queryLower)

  if (isCProgRequest) {
    const hasCCodeOrKeywords =
      responseLower.includes('modulo') ||
      responseLower.includes('% 2') ||
      responseLower.includes('#include') ||
      responseLower.includes('printf') ||
      responseLower.includes('even or odd')

    const hasMagicNumberOffTopic = responseLower.includes('magic number')
    if (!hasCCodeOrKeywords || hasMagicNumberOffTopic) {
      return { valid: false, reason: 'MISSING_C_CODE_OR_OFF_TOPIC_MAGIC_NUMBERS' }
    }
  }

  // 2. Check Array vs Linked List comparison
  const isArrayVsLinkedList =
    /\b(array|arrays)\b/i.test(queryLower) &&
    /\b(linked\s*list|linkedlist)\b/i.test(queryLower) &&
    /\b(difference|compare|vs|versus)\b/i.test(queryLower)

  if (isArrayVsLinkedList) {
    const mentionsBoth = responseLower.includes('array') && responseLower.includes('linked list')
    const mentionsComparison =
      responseLower.includes('contiguous') ||
      responseLower.includes('memory') ||
      responseLower.includes('pointer') ||
      responseLower.includes('fixed') ||
      responseLower.includes('dynamic')

    if (!mentionsBoth || !mentionsComparison) {
      return { valid: false, reason: 'INCOMPLETE_OR_UNBALANCED_ARRAY_LINKEDLIST_COMPARISON' }
    }
  }

  // 3. Check Binary Search sorted array requirement
  const isBinarySearchSorted =
    /\bbinary\s*search\b/i.test(queryLower) &&
    /\b(sorted|array|order)\b/i.test(queryLower)

  if (isBinarySearchSorted) {
    const explainsOrderRequirement =
      responseLower.includes('sorted') &&
      (responseLower.includes('middle') ||
        responseLower.includes('half') ||
        responseLower.includes('divide') ||
        responseLower.includes('eliminate'))

    const hasInsertionSortOffTopic = responseLower.includes('insertion sort')
    if (!explainsOrderRequirement || hasInsertionSortOffTopic) {
      return { valid: false, reason: 'OFF_TOPIC_BINARY_SEARCH_REQUIREMENT' }
    }
  }

  // 4. Check For Loop step-by-step
  const isForLoopStepByStep =
    /\bfor\s+loop\b/i.test(queryLower) &&
    /\b(step|works?|one step)\b/i.test(queryLower)

  if (isForLoopStepByStep) {
    const explainsLoopSteps =
      responseLower.includes('loop') &&
      (responseLower.includes('step') || responseLower.includes('initialization') || responseLower.includes('condition'))

    const isOnlyAlgorithmDefinition =
      responseLower.startsWith('an algorithm is a finite') ||
      responseLower.includes('finite, well-defined sequence of step-by-step instructions designed to solve a problem')

    if (!explainsLoopSteps || isOnlyAlgorithmDefinition) {
      return { valid: false, reason: 'OFF_TOPIC_FOR_LOOP_EXPLANATION' }
    }
  }

  // 5. Check Real-life example of inheritance
  const isInheritanceExample =
    queryLower.includes('inheritance') &&
    /\b(real\s*life|example|everyday|practical)\b/i.test(queryLower)

  if (isInheritanceExample) {
    const hasInheritanceConcept =
      responseLower.includes('inheritance') ||
      responseLower.includes('parent') ||
      responseLower.includes('class') ||
      responseLower.includes('child')

    const hasTelevisionOffTopic =
      responseLower.includes('television') ||
      responseLower.includes('tv series') ||
      responseLower.includes('miniseries') ||
      responseLower.includes('stephen king')

    if (!hasInheritanceConcept || hasTelevisionOffTopic) {
      return { valid: false, reason: 'OFF_TOPIC_INHERITANCE_EXAMPLE_TV' }
    }
  }

  // 6. Check OSI model
  const isOsiModel = /\b(osi|osi\s*model)\b/i.test(queryLower)
  if (isOsiModel) {
    const hasNetworkingConcept =
      responseLower.includes('layer') ||
      responseLower.includes('network') ||
      responseLower.includes('open systems interconnection')

    const hasBandOffTopic = responseLower.includes('band') || responseLower.includes('rock') || responseLower.includes('album')
    if (!hasNetworkingConcept || hasBandOffTopic) {
      return { valid: false, reason: 'OFF_TOPIC_OSI_MODEL_BAND' }
    }
  }

  // 7. Check unknown BCA response policy
  const isUnknownBcaPolicy =
    /\b(do\s+not|don't)\s+know\b/i.test(queryLower) &&
    /\b(answer|respond|bca)\b/i.test(queryLower)

  if (isUnknownBcaPolicy) {
    const addressesPolicy =
      responseLower.includes('not know') ||
      responseLower.includes('honestly') ||
      responseLower.includes('uncertain') ||
      responseLower.includes('textbook') ||
      responseLower.includes('syllabus') ||
      responseLower.includes('instructor')

    const hasRequirementsOffTopic = responseLower.includes('respond within 2 seconds') || responseLower.includes('non-functional requirements')
    if (!addressesPolicy || hasRequirementsOffTopic) {
      return { valid: false, reason: 'OFF_TOPIC_UNKNOWN_RESPONSE_POLICY' }
    }
  }

  // 8. General blacklist: reject raw OCR junk
  if (responseLower.includes('∴ 35a+55b') || responseLower.includes(' ==1') || responseLower.includes('( 2 )ℎ')) {
    return { valid: false, reason: 'RAW_OCR_CORRUPTION' }
  }

  // 9. Unsolicited study notes question suffix check
  if (response.spokenText.includes('Would you like me to save this explanation to your study notes?')) {
    response.spokenText = response.spokenText
      .replace(/\s*Would you like me to save this explanation to your study notes\?\s*/gi, ' ')
      .trim()
  }

  return { valid: true }
}

/**
 * Generates an authoritative, verified answer for core BCA curriculum questions
 */
export async function generateValidatedBcaResponse(
  resolvedQuery: string,
  originalQuery: string
): Promise<AssistantResponse | null> {
  // 1. Check curated BCA Knowledge
  const bcaCurriculum = matchBcaCurriculum(resolvedQuery) || matchBcaCurriculum(originalQuery)
  if (bcaCurriculum) {
    let combinedText = bcaCurriculum.spokenText
    if (bcaCurriculum.codeSnippet && !combinedText.includes('#include') && !combinedText.includes('```')) {
      combinedText = `${bcaCurriculum.spokenText}\n\n\`\`\`c\n${bcaCurriculum.codeSnippet}\n\`\`\``
    }

    return {
      spokenText: combinedText,
      provider: 'offline-agent',
    }
  }

  // 2. Check universal knowledge base
  const universal = await answerUniversalQuestion(resolvedQuery)
  if (universal) {
    return {
      spokenText: universal.spokenText,
      provider: 'offline-agent',
    }
  }

  return null
}

export async function processAssistantMessage(
  userMessage: string,
  context: AssistantContext = {}
): Promise<AssistantResponse> {
  const requestId = `req-${crypto.randomUUID().slice(0, 8)}`
  const query = userMessage.trim()

  // 0. Direct Close Intent: Fast-path for closing voice assistant / modal / tab
  if (isExplicitCloseQuery(query)) {
    console.info(`[${requestId}] Intent: CLOSE`)
    return {
      spokenText: 'Closing Voice Assistant.',
      action: { type: 'CLOSE', target: '/', label: 'Dashboard' },
      provider: 'offline-agent',
    }
  }

  // Resolve coreference and pronouns using conversation history
  const { resolvedQuery } = resolveConversationContext(query, context.history)

  // 1. Direct Intent: "Save that to my notes" / "Add this explanation to notes"
  const isSaveLastToNotes =
    /\b(save|add|put|write|record)\s+(that|this|it|last(\s+answer)?)\s+(to|in)\s+(my\s+)?notes?\b/i.test(query) ||
    /\bmake\s+a\s+note\s+of\s+(that|this|it)\b/i.test(query)

  if (isSaveLastToNotes) {
    const lastAssistantMessage = context.history
      ?.slice()
      .reverse()
      .find((h) => h.role === 'assistant' || h.role === 'model')

    if (lastAssistantMessage && lastAssistantMessage.text) {
      const lastUserMsg = context.history?.slice().reverse().find((h) => h.role === 'user')
      let cleanTitle = 'Study Note'
      if (lastUserMsg) {
        cleanTitle = lastUserMsg.text
          .replace(/^(who is|who was|what is|what are|tell me about|explain|describe)\s+/i, '')
          .replace(/[?.!;,]+$/g, '')
          .trim()
      }
      if (!cleanTitle || cleanTitle.length > 40) {
        const topicMatch = lastAssistantMessage.text.match(/^([^.?!]+)/)
        cleanTitle = (topicMatch ? topicMatch[1] : 'Study Note').slice(0, 32).trim()
      }

      console.info(`[${requestId}] Intent: CREATE_NOTE, Title: "${cleanTitle}"`)
      return {
        spokenText: `I have saved that explanation to your study notes under "${cleanTitle}".`,
        action: {
          type: 'CREATE_NOTE',
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          content: lastAssistantMessage.text,
          subject: 'General Study',
        },
        provider: 'offline-agent',
      }
    }
  }

  // 2. Direct Query: Can AI create quizzes?
  const isCanQuizQuery =
    /\b(can|could|would)\s+(you|ai|the assistant|voice assistant)?\s*(create|make|generate)\s+(a\s+)?(quiz|quize|quizes|quzes|tests?)\b/i.test(query) ||
    (/\b(can|could)\s+ai\s+do\s+it\b/i.test(query) && /quiz/i.test(query)) ||
    /want ai assistant to create quize/i.test(query) ||
    /create quize when it is asked/i.test(query)

  if (isCanQuizQuery) {
    return {
      spokenText: `Yes, absolutely! I can generate custom interactive practice quizzes on any subject in your syllabus or general topics whenever you ask. You can say "Create a quiz on Software Engineering", "Quiz me on Machine Learning", "Create a quiz on Statistics", "Quiz me on Astronomy", or "Quiz me on Python loops". Would you like me to create a quiz for you now?`,
      provider: 'offline-agent',
    }
  }

  // 3. Direct Quiz Generation Intent
  const isQuizGenRequest =
    /\b(create|make|generate|start|give me|load)\s+(a\s+)?(practice\s+)?(quiz|quize|quizes|quzes|tests?)\b/i.test(query) ||
    /\bquiz me\b/i.test(query) ||
    /\btest me\b/i.test(query)

  if (isQuizGenRequest) {
    const generated = await generateQuizForSubject(resolvedQuery, query)
    return {
      spokenText: `I have generated a ${generated.title} with ${generated.questions.length} questions. Opening your quiz now. Question 1: ${generated.questions[0].prompt}`,
      action: {
        type: 'LOAD_QUIZ',
        subject: generated.subject,
        title: generated.title,
        questions: generated.questions,
      },
      provider: env.geminiApiKey ? 'gemini' : 'offline-agent',
    }
  }

  // Search syllabus knowledge base using the resolved query with strict relevance filtering
  const syllabusMatches = searchSyllabus(resolvedQuery, context.currentPath, 3)

  // 4. Try Gemini Generative AI if API key is configured
  if (env.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(env.geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
        systemInstruction: SYSTEM_PROMPT,
      })

      let syllabusContextText = ''
      if (syllabusMatches.length > 0) {
        syllabusContextText =
          `\nOfficial Course Notes Excerpts (Use ONLY if directly relevant to the question):\n` +
          syllabusMatches
            .map((m) => `[Doc: ${m.title} | Subject: ${m.subject} | Page: ${m.page}]\nContent: "${m.snippet}"`)
            .join('\n\n') +
          `\nNote: If the student question is general and not about these specific notes, answer using your broad computer science knowledge.`
      }

      let historyContext = ''
      if (context.history && context.history.length > 0) {
        historyContext =
          `\nRecent Conversation History:\n` +
          context.history
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'Student' : 'Assistant'}: "${h.text}"`)
            .join('\n') +
          '\n'
      }

      const prompt = `Student Information:
- Current Page: ${context.pageTitle || 'Dashboard'} (${context.currentPath || '/'})
- Student Name: ${context.studentName || 'Student'}
${syllabusContextText}
${historyContext}
Student Query: "${resolvedQuery}"`

      const result = await model.generateContent(prompt)
      const text = result.response.text()

      let candidateResponse: AssistantResponse | null = null
      try {
        const parsed = JSON.parse(text)
        if (parsed.spokenText) {
          candidateResponse = {
            spokenText: parsed.spokenText,
            action: parsed.action || undefined,
            provider: 'gemini',
          }
        }
      } catch {
        candidateResponse = {
          spokenText: text.replace(/[*#_`]/g, '').trim(),
          provider: 'gemini',
        }
      }

      if (candidateResponse) {
        // Enforce action separation: Never allow NAVIGATE for academic questions
        if (candidateResponse.action?.type === 'NAVIGATE' && !isExplicitNavigationQuery(query)) {
          delete candidateResponse.action
        }

        // Validate response quality
        const validation = validateAssistantResponse(query, resolvedQuery, candidateResponse)
        if (validation.valid) {
          console.info(`[${requestId}] Gemini response validated successfully.`)
          return candidateResponse
        } else {
          console.warn(`[${requestId}] Gemini response failed validation (${validation.reason}), using verified academic engine fallback.`)
        }
      }
    } catch (error) {
      console.warn(`[${requestId}] Gemini API call failed or timed out:`, error)
    }
  }

  // 5. Intelligent BCA Academic Engine & Accessibility NLU Fallback
  const response = await processOfflineAccessibilityIntent(query, resolvedQuery, context, syllabusMatches)

  // Validate the offline response
  const offlineValidation = validateAssistantResponse(query, resolvedQuery, response)
  if (!offlineValidation.valid) {
    console.warn(`[${requestId}] Offline response failed validation (${offlineValidation.reason}), regenerating with curriculum engine.`)
    const guaranteedAnswer = await generateValidatedBcaResponse(resolvedQuery, query)
    if (guaranteedAnswer) {
      return guaranteedAnswer
    }
  }

  // Ensure no unwanted note saving question is attached
  if (response.spokenText) {
    response.spokenText = response.spokenText
      .replace(/\s*Would you like me to save this explanation to your study notes\?\s*/gi, ' ')
      .trim()
  }

  return response
}

export function isExplicitCloseQuery(query: string): boolean {
  const lower = query.toLowerCase().trim()
  return (
    /^(close|exit|dismiss|leave|quit|hide|shut|go back|back to dashboard|close assistant|close tab|close voice assistant|close the tab)$/i.test(lower) ||
    /\b(close|exit|leave|dismiss|quit|hide|shut)\s+(down\s+)?(the\s+|this\s+)?(ai\s+)?(voice\s+)?(assistant|modal|dialog|tab|drawer|page|window)\b/i.test(lower) ||
    /\b(close|exit|dismiss|quit)\s+(the\s+|this\s+)?(ai\s+voice\s+assistant|assistant|voice assistant)\s*(tab|modal|window|dialog|drawer|page)?\b/i.test(lower) ||
    /\b(close|exit)\s+the\s+ai\b/i.test(lower)
  )
}

export function isExplicitNavigationQuery(query: string): boolean {
  const lower = query.toLowerCase()
  return (
    isExplicitCloseQuery(query) ||
    /\b(go to|open|show me|take me to|navigate to)\b/.test(lower) ||
    /\b(take me to|open up)\s+(the\s+)?(notes|quiz|assignments|calendar|materials|subjects|profile|progress|accessibility|settings|dashboard|home)\b/.test(lower)
  )
}

async function processOfflineAccessibilityIntent(
  rawQuery: string,
  resolvedQuery: string,
  context: AssistantContext,
  syllabusMatches: SyllabusMatch[] = []
): Promise<AssistantResponse> {
  const lower = rawQuery.toLowerCase()
  const resolvedLower = resolvedQuery.toLowerCase()

  // 1. Explicit Close Intents
  if (isExplicitCloseQuery(rawQuery)) {
    return {
      spokenText: 'Closing Voice Assistant.',
      action: { type: 'CLOSE', target: '/', label: 'Dashboard' },
      provider: 'offline-agent',
    }
  }

  // 2. Explicit Navigation Intents
  if (isExplicitNavigationQuery(rawQuery)) {
    if (lower.includes('note')) {
      return {
        spokenText: 'Opening your Notes page. You can review your notes or ask me to record a new one.',
        action: { type: 'NAVIGATE', target: '/notes', label: 'Notes' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('quiz') || lower.includes('test')) {
      return {
        spokenText: 'Taking you to the Quiz page. You can practice multiple choice questions with audio guidance.',
        action: { type: 'NAVIGATE', target: '/quiz', label: 'Quiz' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('assignment') || lower.includes('homework') || lower.includes('task')) {
      return {
        spokenText: 'Opening your Assignments page. You have upcoming assignments in Python, Statistics, and Data Structures.',
        action: { type: 'NAVIGATE', target: '/assignments', label: 'Assignments' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('material') || lower.includes('lesson') || lower.includes('reading') || lower.includes('chapter')) {
      if (lower.includes('python') || lower.includes('loop')) {
        return {
          spokenText: 'Opening your lesson on Python loops. Would you like me to read the first section?',
          action: { type: 'NAVIGATE', target: '/materials/material-1', label: 'Python Loops' },
          provider: 'offline-agent',
        }
      }
      return {
        spokenText: 'Opening Learning Materials. Here you have lessons for Python, Statistics, Data Structures, and AI/ML.',
        action: { type: 'NAVIGATE', target: '/materials', label: 'Learning Materials' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('calendar') || lower.includes('schedule') || lower.includes('event')) {
      return {
        spokenText: 'Opening your Calendar. You have a Persuasive essay due today and Forces and Motion review later this week.',
        action: { type: 'NAVIGATE', target: '/calendar', label: 'Calendar' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('progress') || lower.includes('stats') || lower.includes('score')) {
      return {
        spokenText: 'Opening your Progress page. You can review completed lessons and assignment stats.',
        action: { type: 'NAVIGATE', target: '/progress', label: 'Progress' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('subject') || lower.includes('course') || lower.includes('class')) {
      return {
        spokenText: 'Opening your Subjects page. Enrolled subjects include Python, Statistics, Data Structures, and AI and Machine Learning.',
        action: { type: 'NAVIGATE', target: '/subjects', label: 'Subjects' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('setting') || lower.includes('accessibility') || lower.includes('contrast')) {
      return {
        spokenText: 'Opening Accessibility Settings where you can adjust text size, high contrast, and keyboard focus.',
        action: { type: 'NAVIGATE', target: '/accessibility', label: 'Accessibility Settings' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('profile') || lower.includes('account')) {
      return {
        spokenText: 'Opening your Student Profile page.',
        action: { type: 'NAVIGATE', target: '/profile', label: 'Profile' },
        provider: 'offline-agent',
      }
    }
    if (lower.includes('dashboard') || lower.includes('home')) {
      return {
        spokenText: 'Returning to your Dashboard home screen.',
        action: { type: 'NAVIGATE', target: '/', label: 'Dashboard' },
        provider: 'offline-agent',
      }
    }
  }

  // 2. Explicit Note Taking Intent
  if (
    lower.includes('take a note') ||
    lower.includes('create a note') ||
    lower.includes('write note') ||
    lower.includes('save note') ||
    lower.includes('add note')
  ) {
    const rawContent = rawQuery
      .replace(/^(hey assistant|assistant|please)?\s*(take|create|write|save|add)\s*(a|new)?\s*note(\s*called|\s*titled|\s*about)?/i, '')
      .trim()

    const title = rawContent.slice(0, 30).trim() || 'Voice Note'
    const content = rawContent || 'Recorded via Voice Assistant'
    return {
      spokenText: `I have saved a new note titled ${title} to your notes notebook.`,
      action: {
        type: 'CREATE_NOTE',
        title: title.charAt(0).toUpperCase() + title.slice(1),
        content: content,
        subject: 'General Study',
      },
      provider: 'offline-agent',
    }
  }

  // 3. Accessibility Controls
  if (lower.includes('high contrast')) {
    const enable = !lower.includes('off') && !lower.includes('disable')
    return {
      spokenText: enable ? 'High contrast mode enabled.' : 'High contrast mode turned off.',
      action: { type: 'SET_ACCESSIBILITY', highContrast: enable },
      provider: 'offline-agent',
    }
  }

  if (lower.includes('larger text') || lower.includes('large text') || lower.includes('bigger text') || lower.includes('increase text')) {
    const isExtra = lower.includes('extra')
    return {
      spokenText: isExtra ? 'Text size set to extra large.' : 'Text size set to large.',
      action: { type: 'SET_ACCESSIBILITY', textSize: isExtra ? 'extra-large' : 'large' },
      provider: 'offline-agent',
    }
  }

  if (lower.includes('normal text') || lower.includes('default text') || lower.includes('standard text')) {
    return {
      spokenText: 'Text size reset to default.',
      action: { type: 'SET_ACCESSIBILITY', textSize: 'default' },
      provider: 'offline-agent',
    }
  }

  // 4. Context queries: "Where am I?", "What page is this?", "Read this page"
  if (lower.includes('where am i') || lower.includes('what page') || lower.includes('current page')) {
    const current = context.pageTitle || 'Dashboard'
    return {
      spokenText: `You are currently on the ${current} page. Your URL is ${context.currentPath || '/'}.`,
      provider: 'offline-agent',
    }
  }

  if (lower.includes('read') && (lower.includes('page') || lower.includes('this') || lower.includes('aloud') || lower.includes('summary'))) {
    if (context.pageSummary) {
      return {
        spokenText: `Here is the current page summary: ${context.pageSummary}`,
        action: { type: 'READ_ALOUD', text: context.pageSummary },
        provider: 'offline-agent',
      }
    }
    return {
      spokenText: `You are on ${context.pageTitle || 'the platform'}. I will read the main sections aloud for you.`,
      action: { type: 'READ_ALOUD', text: `Page: ${context.pageTitle || 'Dashboard'}. Browse your courses, notes, and upcoming assignments.` },
      provider: 'offline-agent',
    }
  }

  // 5. Deadlines & Schedule
  if (lower.includes('deadline') || lower.includes('due') || lower.includes('upcoming') || lower.includes('schedule')) {
    return {
      spokenText: 'You have three upcoming items: Persuasive essay outline due today for Data Structures, Forces and Motion review on October 8th, and your Python loops practice.',
      action: { type: 'NAVIGATE', target: '/assignments', label: 'Assignments' },
      provider: 'offline-agent',
    }
  }

  // 6. Help & shortcuts
  if (lower.includes('help') || lower.includes('what can you do') || lower.includes('shortcut')) {
    return {
      spokenText: 'I am your LearnWell Voice Assistant. You can tell me to: Navigate to any page like Notes or Quiz, take voice notes, read lessons aloud, check upcoming deadlines, and ask academic questions on Data Structures, C Programming, Algorithms, and OOP. Press Escape at any time to stop audio playback, or press Alt plus A to toggle listening.',
      provider: 'offline-agent',
    }
  }

  // 7. Core BCA Curriculum Knowledge Match (Priority academic match)
  const bcaCurriculum = matchBcaCurriculum(resolvedQuery) || matchBcaCurriculum(rawQuery)
  if (bcaCurriculum) {
    let combined = bcaCurriculum.spokenText
    if (bcaCurriculum.codeSnippet) {
      combined = `${bcaCurriculum.spokenText}\n\n\`\`\`c\n${bcaCurriculum.codeSnippet}\n\`\`\``
    }
    return {
      spokenText: combined,
      provider: 'offline-agent',
    }
  }

  // 8. Official Syllabus Match (Only if explicitly queried or high confidence)
  if (syllabusMatches && syllabusMatches.length > 0) {
    const isExplicitSyllabusRequest =
      /\b(syllabus|course notes?|unit\s+[1-4]|study material|lesson|uploaded)\b/i.test(resolvedLower) ||
      Boolean(context.currentPath?.startsWith('/materials/'))

    const syllabusAnswer = buildOfflineSyllabusAnswer(resolvedQuery, syllabusMatches)
    if (syllabusAnswer) {
      return {
        spokenText: syllabusAnswer.spokenText,
        // Only navigate if the student specifically asked to open or view materials
        action: isExplicitSyllabusRequest && isExplicitNavigationQuery(rawQuery)
          ? {
              type: 'NAVIGATE',
              target: `/materials/${syllabusAnswer.materialId}`,
              label: syllabusAnswer.title,
            }
          : undefined,
        provider: 'offline-agent',
      }
    }
  }

  // 9. Universal Knowledge Q&A (Wikipedia REST API with validation & local facts)
  const universal = await answerUniversalQuestion(resolvedQuery)
  if (universal) {
    return {
      spokenText: universal.spokenText,
      provider: 'offline-agent',
    }
  }

  // Default transparent response for genuinely unknown queries
  return {
    spokenText: `I do not have enough verified information to answer that question accurately. You can ask me academic questions about Data Structures, C programming, Algorithms, or Software Engineering, or ask me to navigate the platform.`,
    provider: 'offline-agent',
  }
}
