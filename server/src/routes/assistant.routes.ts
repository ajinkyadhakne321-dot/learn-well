import { Router } from 'express'
import { z } from 'zod'
import {
  processVoiceAgentMessage,
  getVoiceAgentStatus,
  type LearningMode,
} from '../services/voiceAgentService.js'
import { generateQuizForSubject } from '../services/quizGeneratorService.js'

export const assistantRouter = Router()

const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  mode: z
    .enum([
      'Academic Learning',
      'Programming & Coding',
      'Engineering Mathematics',
      'Exam Preparation',
      'Practical & Viva',
      'Project Guidance',
    ])
    .optional(),
  branch: z.string().optional(),
  semester: z.string().optional(),
  subject: z.string().optional(),
  conversation_id: z.string().optional(),
  context: z
    .object({
      currentPath: z.string().optional(),
      pageTitle: z.string().optional(),
      pageSummary: z.string().optional(),
      studentName: z.string().optional(),
      notesCount: z.number().int().optional(),
      pendingAssignmentsCount: z.number().int().optional(),
      preferences: z
        .object({
          highContrast: z.boolean().optional(),
          textSize: z.string().optional(),
          underlineLinks: z.boolean().optional(),
        })
        .optional(),
      history: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant', 'model']),
            text: z.string(),
          })
        )
        .optional(),
    })
    .optional(),
})

// GET /api/assistant/status
assistantRouter.get('/status', async (_req, res, next) => {
  try {
    const status = await getVoiceAgentStatus()
    res.json({
      geminiEnabled: false,
      apiKeyRequired: false,
      ...status,
      supportedActions: [
        'NAVIGATE',
        'CREATE_NOTE',
        'SET_ACCESSIBILITY',
        'READ_ALOUD',
        'ANSWER_QUIZ',
        'SPEAK',
        'LOAD_QUIZ',
        'CLOSE',
      ],
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/assistant/chat
assistantRouter.post('/chat', async (req, res, next) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid assistant request payload', details: parseResult.error.flatten() })
      return
    }

    const { message, mode, branch, semester, subject, conversation_id, context } = parseResult.data
    const response = await processVoiceAgentMessage({
      message,
      mode: mode as LearningMode | undefined,
      branch,
      semester,
      subject,
      conversation_id,
      context,
    })

    res.json(response)
  } catch (error) {
    next(error)
  }
})

const quizRequestSchema = z.object({
  subject: z.string().min(1).max(200),
})

// POST /api/assistant/generate-quiz
assistantRouter.post('/generate-quiz', async (req, res, next) => {
  try {
    const parseResult = quizRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Subject is required to generate a quiz' })
      return
    }

    const { subject } = parseResult.data
    const quiz = await generateQuizForSubject(subject)
    res.json(quiz)
  } catch (error) {
    next(error)
  }
})

// Audio streaming proxy from Python voice agent if active
assistantRouter.get('/voice/audio/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params
    if (filename.includes('/') || filename.includes('..')) {
      res.status(400).json({ error: 'Invalid filename' })
      return
    }

    const voiceAgentUrl = process.env.VOICE_AGENT_URL || 'http://127.0.0.1:8000'
    const audioResp = await fetch(`${voiceAgentUrl}/api/voice/audio/${encodeURIComponent(filename)}`)
    if (!audioResp.ok) {
      res.status(audioResp.status).send('Audio not found')
      return
    }

    const contentType = audioResp.headers.get('content-type') || 'audio/wav'
    res.setHeader('Content-Type', contentType)
    const buffer = await audioResp.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (err) {
    next(err)
  }
})
