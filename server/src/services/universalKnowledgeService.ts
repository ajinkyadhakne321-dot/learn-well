// Universal Knowledge Service providing encyclopedic and general-knowledge answers
// Used as high-reliability offline/open knowledge fallback when GEMINI_API_KEY is not configured

export interface UniversalAnswer {
  title: string
  summary: string
  spokenText: string
  source: 'wikipedia' | 'local-encyclopedia'
}

// Built-in high-frequency universal facts and educational concepts
const CURATED_KNOWLEDGE: Record<string, string> = {
  photosynthesis:
    'Photosynthesis is the biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy in the form of sugars.',
  'black hole':
    'A black hole is a region of spacetime where gravity is so strong that nothing, including light and other electromagnetic waves, has enough energy to escape its event horizon.',
  'alan turing':
    'Alan Turing was an English mathematician and computer scientist widely considered the father of theoretical computer science and artificial intelligence.',
  'albert einstein':
    'Albert Einstein was a theoretical physicist best known for developing the theory of relativity, which revolutionized the scientific understanding of space, time, and gravity.',
  'quantum computing':
    'Quantum computing is an emerging multidisciplinary field that uses the principles of quantum mechanics, like superposition and entanglement, to solve complex computational problems faster than classical computers.',
  'gravity':
    'Gravity is a fundamental natural interaction in physics that causes mutual attraction between all things having mass or energy.',
  'dna':
    'DNA, or deoxyribonucleic acid, is the hereditary molecule that carries genetic instructions for the development, functioning, growth, and reproduction of all known living organisms.',
  'artificial intelligence':
    'Artificial intelligence is the field of computer science dedicated to developing systems capable of performing tasks that typically require human intelligence, like speech recognition, reasoning, and learning.',
  'machine learning':
    'Machine learning is a branch of artificial intelligence focused on building algorithms that learn patterns from data and improve their performance over time without being explicitly programmed.',
  'internet':
    'The Internet is a global system of interconnected computer networks that uses the Internet protocol suite to communicate between billions of devices worldwide.',
  'saas':
    'Software as a Service, or SaaS, is a cloud computing service model where applications are hosted by a provider and made available to users over the internet, typically through a web browser with no installation needed. Common examples include Gmail, Google Drive, Microsoft 365, and Salesforce.',
  'software as a service':
    'Software as a Service, or SaaS, is a cloud computing service model where applications are hosted by a provider and made available to users over the internet, typically through a web browser with no installation needed. Common examples include Gmail, Google Drive, Microsoft 365, and Salesforce.',
  'paas':
    'Platform as a Service, or PaaS, is a cloud computing model providing a platform and development environment that allows developers to build, run, and manage applications without managing servers or storage. Examples include Google App Engine, AWS Elastic Beanstalk, and Heroku.',
  'platform as a service':
    'Platform as a Service, or PaaS, is a cloud computing model providing a platform and development environment that allows developers to build, run, and manage applications without managing servers or storage. Examples include Google App Engine, AWS Elastic Beanstalk, and Heroku.',
  'iaas':
    'Infrastructure as a Service, or IaaS, is a cloud computing model providing virtualized computing resources such as physical servers, storage, and networking over the internet. Examples include Amazon Web Services EC2, Microsoft Azure VMs, and Google Compute Engine.',
  'infrastructure as a service':
    'Infrastructure as a Service, or IaaS, is a cloud computing model providing virtualized computing resources such as physical servers, storage, and networking over the internet. Examples include Amazon Web Services EC2, Microsoft Azure VMs, and Google Compute Engine.',
  'cloud computing':
    'Cloud computing is the on-demand delivery of computing services, including servers, storage, databases, networking, software, and analytics, over the internet with pay-as-you-go pricing.',
}

/**
 * Normalizes text to extract the core topic of a query
 */
function extractTopic(query: string): string {
  return query
    .toLowerCase()
    .replace(/^(who is|who was|what is|what are|what was|tell me about|explain|describe|define|how does|why is|why are)\s+/i, '')
    .replace(/[?.!;,]+$/g, '')
    .trim()
}

/**
 * Fetches an encyclopedic summary from Wikipedia REST API with custom User-Agent and timeout
 */
async function fetchWikipediaSummary(topic: string): Promise<UniversalAnswer | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4000)

  try {
    // 1. First attempt direct summary lookup
    const formattedTopic = encodeURIComponent(topic.replace(/\s+/g, '_'))
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${formattedTopic}`

    const res = await fetch(summaryUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LearnWellAssistant/1.0 (Accessible Learning Platform; contact: support@learnwell.org)',
        Accept: 'application/json',
      },
    })

    if (res.ok) {
      const data = (await res.json()) as {
        type?: string
        title?: string
        description?: string
        extract?: string
      }

      if (data.extract && data.type !== 'disambiguation') {
        const cleanExtract = data.extract
          .replace(/\s*\([^)]*\)/g, '') // remove parentheticals for cleaner speech
          .replace(/\s+/g, ' ')
          .trim()

        // Take the first 2-3 sentences for pleasant spoken audio
        const sentences = cleanExtract.split(/(?<=[.!?])\s+/)
        const conciseAudio = sentences.slice(0, 3).join(' ')

        return {
          title: data.title || topic,
          summary: cleanExtract,
          spokenText: `${conciseAudio} Would you like me to save this explanation to your study notes?`,
          source: 'wikipedia',
        }
      }
    }

    // 2. If direct lookup was a disambiguation or failed, use Wikipedia search to find the canonical article
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json`
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LearnWellAssistant/1.0 (Accessible Learning Platform)',
        Accept: 'application/json',
      },
    })

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        query?: {
          search?: Array<{ title: string; snippet: string }>
        }
      }

      const topResult = searchData.query?.search?.[0]
      if (topResult && topResult.title && topResult.title.toLowerCase() !== topic.toLowerCase()) {
        return fetchWikipediaSummary(topResult.title)
      }
    }
  } catch {
    // Network failure or timeout - handled by fallback
  } finally {
    clearTimeout(timeoutId)
  }

  return null
}

/**
 * Answers universal / general knowledge questions
 */
export async function answerUniversalQuestion(query: string): Promise<UniversalAnswer | null> {
  const topic = extractTopic(query)
  if (!topic || topic.length < 2) return null

  // Check curated concepts
  for (const [key, answer] of Object.entries(CURATED_KNOWLEDGE)) {
    if (topic.includes(key) || key.includes(topic)) {
      return {
        title: key.toUpperCase(),
        summary: answer,
        spokenText: `${answer} Would you like me to save this explanation to your study notes?`,
        source: 'local-encyclopedia',
      }
    }
  }

  // Fetch online encyclopedic answer
  return fetchWikipediaSummary(topic)
}
