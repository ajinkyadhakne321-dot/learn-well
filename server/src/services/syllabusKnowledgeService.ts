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
  'between', 'difference', 'differences', 'write', 'program', 'check', 'whether', 'using',
  'code', 'works', 'work', 'step', 'steps', 'time', 'one', 'example', 'examples', 'real',
  'life', 'know', 'answer', 'respond', 'response', 'should', 'simple', 'language', 'please',
  'much', 'many', 'show', 'find', 'get', 'use', 'need', 'make', 'call', 'called', 'would',
  'will', 'like', 'just', 'also', 'number', 'numbers', 'question', 'questions', 'help',
])

// Subject-specific domain anchor terms required for topical relevance
const SUBJECT_DOMAIN_TERMS: Record<string, string[]> = {
  statistic: [
    'mean', 'median', 'mode', 'dispersion', 'quartile', 'quartiles',
    'variance', 'standard deviation', 'central tendency', 'frequency distribution', 'ungrouped',
    'grouped data', 'cumulative frequency', 'skewness', 'kurtosis', 'probability',
  ],
  'software engineering': [
    'software engineering', 'sdlc', 'waterfall', 'agile', 'scrum', 'requirements', 'srs',
    'functional requirement', 'non-functional requirement', 'software maintenance', 'risk management',
    'feasibility study', 'software testing', 'black box', 'white box',
  ],
  aiml: [
    'machine learning', 'supervised learning', 'unsupervised learning', 'decision tree', 'random forest',
    'support vector machine', 'svm', 'hyperplane', 'defect prediction', 'test case generation',
    'natural language processing', 'nlp', 'deep learning', 'cloud computing', 'saas', 'paas', 'iaas',
  ],
  cloud: [
    'cloud computing', 'saas', 'paas', 'iaas', 'service models', 'cloud deployment', 'nist',
    'virtualization', 'public cloud', 'private cloud', 'hybrid cloud', 'multi-tenant',
  ],
  python: [
    'python loop', 'python loops', 'python for', 'python while', 'iterable', 'enumerate',
    'break statement', 'continue statement', 'pass statement', 'nested loop', 'zip function',
  ],
  datastructure: [
    'data structures and algorithms', 'time complexity', 'space complexity', 'big o',
    'asymptotic notation', 'asymptotic analysis', 'algorithmic efficiency',
  ],
}

// Broad programming language and subject tokens that by themselves do not indicate specific topical relevance
const BROAD_SUBJECT_KEYWORDS = new Set([
  'python', 'c', 'java', 'programming', 'code', 'program',
  'statistic', 'statistics', 'math', 'mathematics',
  'cloud', 'software', 'engineering', 'computer', 'science',
])

export function searchSyllabus(query: string, currentPath?: string, maxResults: number = 3): SyllabusMatch[] {
  const docs = loadSyllabusData()
  const cleanQuery = query.toLowerCase()
  const rawTokens = cleanQuery.split(/[\s,?.!;:()"]+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t))

  if (rawTokens.length === 0) return []

  const isExplicitSyllabusQuery =
    /\b(syllabus|course notes?|unit\s+[1-4]|study material|lesson|chapter|uploaded document)\b/i.test(cleanQuery)

  // Substantive topical tokens distinct from broad subject category names
  const substantiveTopicTokens = rawTokens.filter((t) => !BROAD_SUBJECT_KEYWORDS.has(t))

  // Extract multi-token phrases of substantive tokens
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
    const docSubjectKey = doc.subject.toLowerCase()
    const docSubjectMatch = cleanQuery.includes(docSubjectKey)
    const docTitleMatch =
      cleanQuery.includes(doc.title.toLowerCase()) ||
      doc.title.toLowerCase().split(/[\s:,-]+/).some((w) => w.length > 4 && !STOP_WORDS.has(w) && cleanQuery.includes(w))

    // Determine domain terms for this document
    const domainTerms = SUBJECT_DOMAIN_TERMS[docSubjectKey] || []
    const hasDomainTermInQuery = domainTerms.some((dt) => cleanQuery.includes(dt))

    // Unless the user explicitly queried syllabus/notes or is currently on this doc,
    // require at least one domain-specific term or title match
    if (!isExplicitSyllabusQuery && !isDocActive && !docSubjectMatch && !docTitleMatch && !hasDomainTermInQuery) {
      continue
    }

    for (const page of doc.pages) {
      const pageText = page.text
      const pageLower = pageText.toLowerCase()

      // For general educational queries, if query has substantive topic tokens,
      // the page MUST contain at least one substantive topic token or phrase.
      // Matching only broad subject tokens (like 'python') while completely missing the substantive
      // topic (e.g. 'file', 'handling', 'inheritance') is an immediate mismatch.
      if (!isExplicitSyllabusQuery && !isDocActive && substantiveTopicTokens.length > 0) {
        const matchesAnySubstantive = substantiveTopicTokens.some((t) => {
          const regex = new RegExp(`\\b${t}\\b`, 'i')
          return regex.test(pageLower)
        })
        const matchesAnyPhrase = phrases.some((p) => pageLower.includes(p))

        if (!matchesAnySubstantive && !matchesAnyPhrase) {
          continue
        }
      }

      let score = 0

      // Exact phrase match bonus for multi-word queries
      if (cleanQuery.length > 10 && pageLower.includes(cleanQuery)) {
        score += 60
      }

      // Multi-word phrase matches of substantive tokens
      for (const phrase of phrases) {
        if (pageLower.includes(phrase)) {
          score += 35
        }
      }

      // Technical acronym exact match bonus (e.g. SDLC, ACID, NIST)
      for (const token of rawTokens) {
        if (/^[a-z]{3,5}$/i.test(token) && cleanQuery.toUpperCase().includes(token.toUpperCase())) {
          if (pageLower.includes(token)) {
            score += 20
          }
        }
      }

      // Check individual substantive tokens
      let matchedTokenCount = 0
      let matchedSubstantiveCount = 0
      for (const token of rawTokens) {
        if (pageLower.includes(token)) {
          const regex = new RegExp(`\\b${token}\\b`, 'gi')
          const count = (pageLower.match(regex) || []).length
          if (count > 0) {
            matchedTokenCount++
            const isSubstantive = !BROAD_SUBJECT_KEYWORDS.has(token)
            if (isSubstantive) {
              matchedSubstantiveCount++
              score += 10 + Math.min(count * 4, 20)
            } else {
              score += 3 + Math.min(count * 2, 6)
            }
          }
        }
      }

      // Contextual boosts
      if (isDocActive) score += 20
      if (docSubjectMatch && matchedSubstantiveCount > 0) score += 15
      if (docTitleMatch) score += 15
      if (hasDomainTermInQuery) score += 15

      // Require meaningful score and matching substantive tokens
      const minRequiredScore = isExplicitSyllabusQuery || isDocActive ? 25 : 40
      const hasRequiredTokens =
        isExplicitSyllabusQuery || isDocActive || substantiveTopicTokens.length === 0
          ? matchedTokenCount >= 1
          : matchedSubstantiveCount >= 1

      if (score >= minRequiredScore && hasRequiredTokens) {
        // Find best snippet around first matched substantive token
        let bestIndex = -1
        const tokensToSearch = substantiveTopicTokens.length > 0 ? substantiveTopicTokens : rawTokens
        for (const token of tokensToSearch) {
          const idx = pageLower.indexOf(token)
          if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
            bestIndex = idx
          }
        }
        if (bestIndex === -1) bestIndex = 0

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
  const specificTokens = rawTokens.filter((t) => !BROAD_SUBJECT_KEYWORDS.has(t))

  // Split into sentences
  const sentences = cleanedText.split(/(?<=[.?!])\s+/).filter((s) => s.length > 15)

  // Find sentences that contain the matched tokens, heavily weighting specific differentiating tokens
  const scoredSentences = sentences.map((sentence, index) => {
    const sLower = sentence.toLowerCase()
    let sScore = 0

    // Specific non-generic tokens get high weight
    for (const t of specificTokens) {
      if (sLower.includes(t)) sScore += 15
    }
    for (const t of rawTokens) {
      if (sLower.includes(t)) sScore += 3
    }
    // Boost sentences containing 2-word query phrases (e.g. "private cloud")
    if (cleanQuery.includes('private cloud') && sLower.includes('private cloud')) {
      sScore += 35
    }
    if (cleanQuery.includes('public cloud') && sLower.includes('public cloud')) {
      sScore += 35
    }
    if (cleanQuery.includes('sdlc') && sLower.includes('sdlc')) {
      sScore += 35
    }

    return { sentence, index, score: sScore }
  })

  // Pick top sentences
  scoredSentences.sort((a, b) => b.score - a.score)
  const topSentences = scoredSentences.filter((s) => s.score > 0).slice(0, 3)
  topSentences.sort((a, b) => a.index - b.index) // preserve natural reading order

  if (topSentences.length === 0 || top.score < 30) {
    return null
  }

  let selectedText = topSentences.map((s) => s.sentence).join(' ')
  
  // Clean formula junk or broken OCR symbols
  selectedText = selectedText
    .replace(/[∴∵∑√≠≤≥≈±×÷]/g, '')
    .replace(/\b\d+[a-z]\s*[+-]\s*\d+[a-z]\b/gi, '')
    .replace(/\bty providers\b/gi, 'third-party providers')
    .replace(/\ble organization\b/gi, 'single organization')
    .replace(/\but not shared\b/gi, 'but not shared')
    .replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (selectedText.length < 20) {
    return null
  }

  const spoken = `According to your course material "${top.title}" on page ${top.page}: ${selectedText}`

  return {
    spokenText: spoken,
    materialId: top.materialId,
    title: top.title,
  }
}

