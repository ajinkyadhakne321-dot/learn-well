import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { HttpError } from '../middleware/errorHandler.js'

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
const MATERIALS_DIR = path.join(UPLOADS_DIR, 'materials')
const SUBMISSIONS_DIR = path.join(UPLOADS_DIR, 'submissions')

// Ensure upload directories exist
fs.mkdirSync(MATERIALS_DIR, { recursive: true })
fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true })

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
])

const allowedExtensions = new Set(['.pdf', '.docx', '.doc', '.txt', '.md'])

const materialStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MATERIALS_DIR)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname).toLowerCase()
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    cb(null, `${baseName}-${uniqueSuffix}${ext}`)
  },
})

const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, SUBMISSIONS_DIR)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname).toLowerCase()
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
    cb(null, `${baseName}-${uniqueSuffix}${ext}`)
  },
})

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedExtensions.has(ext) || allowedMimeTypes.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new HttpError(400, 'Invalid file type. Only PDF, DOCX, and text files (.txt, .md) are supported.'))
  }
}

export const materialUpload = multer({
  storage: materialStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter,
})

export const submissionUpload = multer({
  storage: submissionStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter,
})
