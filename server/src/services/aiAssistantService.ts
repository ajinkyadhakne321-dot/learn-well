import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'

export type AssistantAction =
  | { type: 'NAVIGATE'; target: string; label: string }
  | { type: 'CREATE_NOTE'; title: string; content: string; subject: string }
  | { type: 'SET_ACCESSIBILITY'; highContrast?: boolean; textSize?: 'default' | 'large' | 'extra-large'; underlineLinks?: boolean; strongerFocus?: boolean }
  | { type: 'READ_ALOUD'; text: string }
  | { type: 'ANSWER_QUIZ'; answerIndex: number; explanation: string }
  | { type: 'SPEAK'; text: string }

export interface AssistantResponse {
  spokenText: string
  action?: AssistantAction
  provider: 'gemini' | 'offline-agent'
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
}

const SYSTEM_PROMPT = `You are "LearnWell Voice Assistant", an AI co-pilot designed specifically for students who are blind or visually impaired.
Your primary job is to help the student navigate this learning platform, manage their studies, take notes, and understand learning material orally.

Rules for your voice output:
1. Output concise, pleasant, natural spoken English. Blind students listen to audio output at high speeds.
2. NEVER use markdown tables, asterisks, hash headers, or ASCII drawings because screen readers will stumble over them.
3. Be direct, clear, and reassuring.
4. When a student asks to go somewhere or do an action, respond with JSON matching this structure:
{
  "spokenText": "Clear verbal confirmation and helpful summary",
  "action": {
    "type": "NAVIGATE" | "CREATE_NOTE" | "SET_ACCESSIBILITY" | "READ_ALOUD" | "ANSWER_QUIZ" | "SPEAK",
    ...action properties
  }
}

Available routes for NAVIGATE action:
- "/" (Dashboard)
- "/subjects" (Subjects list: Python, Statistics, Data Structures, AI/ML)
- "/materials" (Learning materials and lessons)
- "/materials/material-1" (Python Loops lesson)
- "/materials/material-2" (Frequency Distribution lesson)
- "/materials/material-3" (Algorithm fundamentals)
- "/materials/material-4" (Linear Regression)
- "/notes" (Student's saved notes)
- "/assignments" (Upcoming assignments & quizzes)
- "/quiz" (Practice quiz)
- "/calendar" (Schedule and events)
- "/progress" (Learning progress and statistics)
- "/profile" (Student profile)
- "/accessibility" (Visual and contrast settings)
- "/assistant" (Voice assistant home)`

export async function processAssistantMessage(
  userMessage: string,
  context: AssistantContext = {}
): Promise<AssistantResponse> {
  const query = userMessage.trim()

  // 1. Try Gemini Generative AI if API key is configured
  if (env.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(env.geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        systemInstruction: SYSTEM_PROMPT,
      })

      const prompt = `Current Context:
- Active Route: ${context.currentPath || '/'}
- Page Title: ${context.pageTitle || 'Dashboard'}
- Student Name: ${context.studentName || 'Student'}
- Notes Count: ${context.notesCount ?? 0}
- Pending Assignments: ${context.pendingAssignmentsCount ?? 3}

Student voice input: "${query}"`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      try {
        const parsed = JSON.parse(text)
        if (parsed.spokenText) {
          return {
            spokenText: parsed.spokenText,
            action: parsed.action,
            provider: 'gemini',
          }
        }
      } catch {
        return {
          spokenText: text.replace(/[*#_`]/g, '').trim(),
          provider: 'gemini',
        }
      }
    } catch (error) {
      console.warn('Gemini API call failed, using built-in accessibility NLU fallback:', error)
    }
  }

  // 2. Intelligent Built-in Accessibility NLU Engine
  return processOfflineAccessibilityIntent(query, context)
}

function processOfflineAccessibilityIntent(
  query: string,
  context: AssistantContext
): AssistantResponse {
  const lower = query.toLowerCase()

  // Navigation intents
  if (/\b(go to|open|show|navigate to|take me to)\b/.test(lower) || /\b(notes|quiz|assignments|calendar|materials|subjects|profile|progress|accessibility|settings|dashboard|home)\b/.test(lower)) {
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

  // Create Note Intent
  if (lower.includes('take a note') || lower.includes('create a note') || lower.includes('write note') || lower.includes('save note') || lower.includes('add note')) {
    const rawContent = query
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

  // Accessibility Setting Controls
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

  // Context Queries: "Where am I?", "What page is this?", "Read this page"
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

  // Deadlines & Upcoming query
  if (lower.includes('deadline') || lower.includes('due') || lower.includes('upcoming') || lower.includes('schedule')) {
    return {
      spokenText: 'You have three upcoming items: Persuasive essay outline due today for Data Structures, Forces and Motion review on October 8th, and your Python loops practice.',
      action: { type: 'NAVIGATE', target: '/assignments', label: 'Assignments' },
      provider: 'offline-agent',
    }
  }

  // Help & Shortcuts
  if (lower.includes('help') || lower.includes('what can you do') || lower.includes('shortcut')) {
    return {
      spokenText: 'I am your LearnWell Voice Assistant. You can tell me to: Navigate to any page like Notes or Quiz, take voice notes, read lessons aloud, check upcoming deadlines, and adjust accessibility options like high contrast. Press Escape at any time to stop audio playback, or press Alt plus A to toggle listening.',
      provider: 'offline-agent',
    }
  }

  // Educational Explanations (Python, ML, Data Structures, Stats)
  if (lower.includes('loop') || (lower.includes('python') && lower.includes('loop'))) {
    return {
      spokenText: 'In Python, a loop allows you to repeat a block of code multiple times. A for loop iterates over sequences like lists or ranges, while a while loop executes as long as a specified condition evaluates to true.',
      action: { type: 'NAVIGATE', target: '/materials/material-1', label: 'Python Loops' },
      provider: 'offline-agent',
    }
  }

  if (lower.includes('linear regression') || lower.includes('machine learning')) {
    return {
      spokenText: 'Linear regression is a foundational machine learning algorithm that models the relationship between a dependent scalar variable and one or more explanatory variables by fitting a linear equation to observed data.',
      action: { type: 'NAVIGATE', target: '/materials/material-4', label: 'Linear Regression' },
      provider: 'offline-agent',
    }
  }

  if (lower.includes('algorithm')) {
    return {
      spokenText: 'An algorithm is a finite, well-defined sequence of step-by-step instructions designed to solve a problem or perform a computation.',
      action: { type: 'NAVIGATE', target: '/materials/material-3', label: 'Algorithms' },
      provider: 'offline-agent',
    }
  }

  // Default friendly conversational response
  return {
    spokenText: `I heard: "${query}". You can ask me to navigate to Notes, Quiz, or Assignments, read your current lesson, or create a new note.`,
    provider: 'offline-agent',
  }
}
