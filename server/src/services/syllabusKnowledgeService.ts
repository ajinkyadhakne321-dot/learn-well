import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface SyllabusPage {
  page: number
  text: string
}

export interface SyllabusDocument {
  materialId: string
  file: string
  subject: string
  title: string
  pageCount: number
  pages: SyllabusPage[]
}

export interface SyllabusMatch {
  materialId: string
  subject: string
  title: string
  page: number
  snippet: string
  score: number
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load extracted syllabus documents
let cachedDocuments: SyllabusDocument[] = []

function loadSyllabusData(): SyllabusDocument[] {
  if (cachedDocuments.length > 0) return cachedDocuments

  const dataPath = path.resolve(__dirname, '../data/extractedSyllabus.json')
  if (fs.existsSync(dataPath)) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8')
      cachedDocuments = JSON.parse(raw) as SyllabusDocument[]
    } catch (err) {
      console.warn('Failed to parse extractedSyllabus.json:', err)
    }
  }

  // Add Python Loops and Data Structures course materials
  cachedDocuments.push({
    materialId: 'material-1',
    file: 'loops.ts',
    subject: 'python',
    title: 'Python Loops & Control Structures',
    pageCount: 6,
    pages: [
      {
        page: 1,
        text: 'Python Loops repeat a block of code. Python for loops process items in an iterable sequence (string, list, dictionary). While loops repeat as long as a Boolean condition remains true. Loop control statements include break (exits immediately), continue (skips to next iteration), and pass (placeholder). Loops can have an else block that executes after normal completion without break. Nested loops place an inner loop inside an outer loop. Loop utilities include enumerate() for index-item pairs and zip() for parallel sequence iteration.',
      },
    ],
  })

  cachedDocuments.push({
    materialId: 'material-3',
    file: 'algorithms.ts',
    subject: 'datastructure',
    title: 'Data Structures & Algorithms Fundamentals',
    pageCount: 3,
    pages: [
      {
        page: 1,
        text: 'An algorithm is a finite, well-defined sequence of step-by-step instructions designed to solve a computational problem. Key characteristics include input, output, definiteness, finiteness, and effectiveness. Algorithmic efficiency is measured using Time Complexity and Space Complexity with Asymptotic Big O notation.',
      },
    ],
  })

  return cachedDocuments
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'of', 'for', 'to', 'what',
  'how', 'why', 'can', 'you', 'tell', 'me', 'explain', 'give', 'about', 'with', 'from',
  'this', 'that', 'these', 'those', 'are', 'was', 'were', 'it', 'its', 'be', 'been',
  'does', 'do', 'did', 'have', 'has', 'had', 'according', 'syllabus', 'pdf', 'notes',
])

export function searchSyllabus(query: string, currentPath?: string, maxResults: number = 3): SyllabusMatch[] {
  const docs = loadSyllabusData()
  const cleanQuery = query.toLowerCase()
  const rawTokens = cleanQuery.split(/[\s,?.!;:()"]+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t))

  if (rawTokens.length === 0) return []

  // Extract multi-token phrases
  const phrases: string[] = []
  if (rawTokens.length >= 2) {
    for (let i = 0; i < rawTokens.length - 1; i++) {
      phrases.push(`${rawTokens[i]} ${rawTokens[i + 1]}`)
    }
  }
  if (rawTokens.length >= 3) {
    for (let i = 0; i < rawTokens.length - 2; i++) {
      phrases.push(`${rawTokens[i]} ${rawTokens[i + 1]} ${rawTokens[i + 2]}`)
    }
  }

  const matches: SyllabusMatch[] = []

  // Check if currentPath hints at a specific material
  const activeMaterialId = currentPath?.startsWith('/materials/') ? currentPath.replace('/materials/', '') : ''

  for (const doc of docs) {
    const isDocActive = activeMaterialId === doc.materialId
    const docSubjectMatch = cleanQuery.includes(doc.subject.toLowerCase())
    const docTitleMatch = cleanQuery.includes(doc.title.toLowerCase())

    for (const page of doc.pages) {
      const pageText = page.text
      const pageLower = pageText.toLowerCase()
      let score = 0

      // Exact phrase match bonus
      if (cleanQuery.length > 8 && pageLower.includes(cleanQuery)) {
        score += 60
      }

      // Multi-word phrase matches
      for (const phrase of phrases) {
        if (pageLower.includes(phrase)) {
          score += 35
        }
      }

      // Check individual tokens
      for (const token of rawTokens) {
        if (pageLower.includes(token)) {
          const regex = new RegExp(`\\b${token}\\b`, 'gi')
          const count = (pageLower.match(regex) || []).length
          score += 5 + Math.min(count * 3, 15)
        }
      }

      // Contextual boosts
      if (isDocActive) score += 15
      if (docSubjectMatch) score += 10
      if (docTitleMatch) score += 10

      const minScore = rawTokens.length === 1 ? 7 : 10
      if (score >= minScore) {
        // Find best snippet around first matched token
        let bestIndex = -1
        for (const token of rawTokens) {
          const idx = pageLower.indexOf(token)
          if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
            bestIndex = idx
          }
        }

        const start = Math.max(0, bestIndex - 60)
        const end = Math.min(pageText.length, bestIndex + 220)
        let snippet = pageText.slice(start, end).replace(/\s+/g, ' ').trim()
        if (start > 0) snippet = '...' + snippet
        if (end < pageText.length) snippet = snippet + '...'

        matches.push({
          materialId: doc.materialId,
          subject: doc.subject,
          title: doc.title,
          page: page.page,
          snippet,
          score,
        })
      }
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)

  // Deduplicate by material + page
  const seen = new Set<string>()
  const deduped: SyllabusMatch[] = []
  for (const m of matches) {
    const key = `${m.materialId}-p${m.page}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(m)
      if (deduped.length >= maxResults) break
    }
  }

  return deduped
}

/**
 * Builds a natural spoken answer from matched syllabus content for offline/fallback mode.
 */
export function buildOfflineSyllabusAnswer(query: string, matches: SyllabusMatch[]): { spokenText: string; materialId: string; title: string } | null {
  if (matches.length === 0) return null

  const top = matches[0]
  const docs = loadSyllabusData()
  const doc = docs.find((d) => d.materialId === top.materialId)
  const fullPage = doc?.pages.find((p) => p.page === top.page)?.text || top.snippet

  // Clean lines and strip HTML/markdown tags
  const cleanedText = fullPage
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[•▪∙*#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const cleanQuery = query.toLowerCase()
  const rawTokens = cleanQuery.split(/[\s,?.!;:()"]+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t))

  // Split into sentences
  const sentences = cleanedText.split(/(?<=[.?!])\s+/).filter((s) => s.length > 15)

  // Find sentences that contain the matched tokens
  const scoredSentences = sentences.map((sentence, index) => {
    const sLower = sentence.toLowerCase()
    let sScore = 0
    for (const t of rawTokens) {
      if (sLower.includes(t)) sScore += 5
    }
    return { sentence, index, score: sScore }
  })

  // Pick top sentences
  scoredSentences.sort((a, b) => b.score - a.score)
  const topSentences = scoredSentences.filter((s) => s.score > 0).slice(0, 3)
  topSentences.sort((a, b) => a.index - b.index) // preserve natural reading order

  const selectedText = topSentences.length > 0
    ? topSentences.map((s) => s.sentence).join(' ')
    : sentences.slice(0, 2).join(' ')

  const spoken = `According to ${top.title} on page ${top.page}: ${selectedText}`

  return {
    spokenText: spoken,
    materialId: top.materialId,
    title: top.title,
  }
}
