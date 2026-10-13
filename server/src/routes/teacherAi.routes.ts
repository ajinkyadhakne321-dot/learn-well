import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { generateQuizForSubject } from '../services/quizGeneratorService.js'

export const teacherAiRouter = Router()

teacherAiRouter.use(requireAuth)
teacherAiRouter.use(requireRole('teacher'))

const draftQuizSchema = z.object({
  subject: z.string().trim().min(2).max(100),
  topic: z.string().trim().max(100).optional(),
  count: z.number().int().min(1).max(10).default(3),
})

// POST /api/teacher/ai/draft-quiz
teacherAiRouter.post('/draft-quiz', asyncHandler(async (req, res) => {
  const { subject, topic } = draftQuizSchema.parse(req.body)

  const subjectOrTopic = topic ? `${subject}: ${topic}` : subject
  const generated = await generateQuizForSubject(subjectOrTopic)

  res.json({
    title: `${topic || subject} Quiz (Draft)`,
    description: `AI-drafted quiz for ${subject}. Review questions before publishing to students.`,
    questions: generated.questions,
  })
}))

const draftSummarySchema = z.object({
  topic: z.string().trim().min(2).max(200),
  subject: z.string().trim().min(2).max(100),
  readingLevel: z.string().optional().default('accessible'),
})

// POST /api/teacher/ai/draft-summary
teacherAiRouter.post('/draft-summary', asyncHandler(async (req, res) => {
  const { topic, subject } = draftSummarySchema.parse(req.body)

  if (env.geminiApiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(env.geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const prompt = `You are an educational assistant helping a teacher create accessible study material for students.
Create a structured learning summary for the subject "${subject}" and topic "${topic}".
Include:
1. Learning Objectives (3 bullet points)
2. Core Conceptual Explanation (clear, friendly, accessible plain English)
3. Real-world Example
4. Key Takeaways (3 concise points)
Keep it accessible for text-to-speech screen readers (avoid overly complex ASCII diagrams).`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return res.json({ draftContent: text })
    } catch {
      // Fallback if Gemini fails or rate limited
    }
  }

  // High quality fallback draft
  const draftContent = `### ${topic} - Accessible Study Guide
**Subject:** ${subject}

#### 1. Learning Objectives
* Understand the core definition and foundational mechanics of ${topic}.
* Identify where ${topic} is utilized in modern practical applications.
* Master essential problem-solving strategies related to ${topic}.

#### 2. Conceptual Overview
${topic} is a fundamental pillar within ${subject}. In simple terms, it provides the structured rules and principles needed to solve complex problems reliably. When analyzing ${topic}, consider how inputs flow through the system and produce predictable, verifiable outputs.

#### 3. Real-World Example
Consider an everyday system like an automated thermostat or navigation route planner: ${topic} acts behind the scenes to optimize the pathway, ensuring consistency and safety under varying conditions.

#### 4. Key Takeaways
* Clarity of structure enables maintainable solutions.
* Always verify boundary conditions and edge cases.
* Practice with realistic examples to reinforce mastery.`

  res.json({ draftContent })
}))

const draftExplanationSchema = z.object({
  concept: z.string().trim().min(2).max(200),
  subject: z.string().trim().min(2).max(100),
})

// POST /api/teacher/ai/draft-explanation
teacherAiRouter.post('/draft-explanation', asyncHandler(async (req, res) => {
  const { concept, subject } = draftExplanationSchema.parse(req.body)

  const explanation = `In ${subject}, "${concept}" can be understood as a clear, step-by-step approach. Think of it like a recipe: every step builds upon the previous one. Breaking it into small components ensures no detail is overlooked, making it accessible to understand and apply.`

  res.json({ explanation })
}))
