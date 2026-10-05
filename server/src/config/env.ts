import { config as loadDotEnv } from 'dotenv'
import { z } from 'zod'

loadDotEnv()

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.string().default('false').transform((value) => value === 'true'),
  SESSION_SECRET: z.string().min(32),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  GEMINI_API_KEY: z.string().optional(),
})

const parsedEnvironment = environmentSchema.safeParse(process.env)

if (!parsedEnvironment.success) {
  console.error('Invalid server environment:', parsedEnvironment.error.flatten().fieldErrors)
  throw new Error('Server environment validation failed')
}

export const env = {
  nodeEnv: parsedEnvironment.data.NODE_ENV,
  port: parsedEnvironment.data.PORT,
  databaseUrl: parsedEnvironment.data.DATABASE_URL,
  databaseSsl: parsedEnvironment.data.DATABASE_SSL,
  sessionSecret: parsedEnvironment.data.SESSION_SECRET,
  clientOrigins: parsedEnvironment.data.CLIENT_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  geminiApiKey: parsedEnvironment.data.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
}