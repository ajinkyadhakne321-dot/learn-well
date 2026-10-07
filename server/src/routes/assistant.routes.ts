import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { processAssistantMessage, type AssistantContext } from '../services/aiAssistantService.js'

export const assistantRouter = Router()

const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z.object({
    currentPath: z.string().optional(),
    pageTitle: z.string().optional(),
    pageSummary: z.string().optional(),
    studentName: z.string().optional(),
    notesCount: z.number().int().optional(),
    pendingAssignmentsCount: z.number().int().optional(),
    preferences: z.object({
      highContrast: z.boolean().optional(),
      textSize: z.string().optional(),
      underlineLinks: z.boolean().optional(),
    }).optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant', 'model']),
      text: z.string(),
    })).optional(),
  }).optional(),
})

assistantRouter.get('/status', (_req, res) => {
  res.json({
    available: true,
    geminiEnabled: Boolean(env.geminiApiKey),
    supportedActions: [
      'NAVIGATE',
      'CREATE_NOTE',
      'SET_ACCESSIBILITY',
      'READ_ALOUD',
      'ANSWER_QUIZ',
      'SPEAK',
      'LOAD_QUIZ',
    ],
  })
})

const quizRequestSchema = z.object({
  subject: z.string().min(1).max(200),
})

assistantRouter.post('/generate-quiz', async (req, res, next) => {
  try {
    const parseResult = quizRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Subject is required to generate a quiz' })
      return
    }

    const { subject } = parseResult.data
    const { generateQuizForSubject } = await import('../services/quizGeneratorService.js')
    const quiz = await generateQuizForSubject(subject)

    res.json(quiz)
  } catch (error) {
    next(error)
  }
})

assistantRouter.post('/chat', async (req, res, next) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid assistant request payload' })
      return
    }

    const { message, context } = parseResult.data
    const response = await processAssistantMessage(message, context as AssistantContext)

    res.json(response)
  } catch (error) {
    next(error)
  }
})
