import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import { searchSyllabus } from './syllabusKnowledgeService.js'

export interface GeneratedQuizQuestion {
  prompt: string
  answers: string[]
  correctAnswer: number
  explanation: string
}

export interface GeneratedQuiz {
  subject: string
  title: string
  questions: GeneratedQuizQuestion[]
}

const BUILTIN_QUIZ_BANKS: Record<string, GeneratedQuiz> = {
  'software engineering': {
    subject: 'software engineering',
    title: 'Software Engineering & SDLC Quiz',
    questions: [
      {
        prompt: 'What is the primary purpose of a Software Requirements Specification (SRS) document?',
        answers: [
          'To serve as an official agreement between the client and development team describing system services and constraints',
          'To write the executable machine code for production deployment',
          'To design marketing brochures for the product launch',
        ],
        correctAnswer: 0,
        explanation: 'According to Unit II notes (Page 21), an SRS document is a complete blueprint that describes software behavior, features, and constraints, acting as an official agreement between client and developers.',
      },
      {
        prompt: 'Which of the following is considered a Non-Functional Requirement (NFR)?',
        answers: [
          'User shall be able to add products to the cart',
          'The login transaction should complete within 2 seconds',
          'User shall be able to download a bank statement',
        ],
        correctAnswer: 1,
        explanation: 'Non-functional requirements specify quality attributes like performance, security, and response time (e.g., completing within 2 seconds), whereas functional requirements specify what the system does.',
      },
      {
        prompt: 'In the Waterfall model, when does testing take place?',
        answers: [
          'Continuously in parallel with daily coding sprints',
          'Only after the implementation and development phase is completely finished',
          'Before any requirements gathering begins',
        ],
        correctAnswer: 1,
        explanation: 'The Waterfall model is a sequential life-cycle model where each phase must be completed before the next starts, so testing occurs sequentially after implementation.',
      },
      {
        prompt: 'What does the mnemonic "Functional = WHAT, Non-Functional = HOW WELL" represent in Software Engineering?',
        answers: [
          'Functional describes system services, while Non-Functional describes quality, performance, and constraints',
          'Functional is for front-end, while Non-Functional is for back-end database queries',
          'Functional is for manual testing, while Non-Functional is for unit testing',
        ],
        correctAnswer: 0,
        explanation: 'Functional requirements define WHAT the system does (features), whereas Non-Functional requirements define HOW WELL it performs under constraints.',
      },
    ],
  },
  'aiml': {
    subject: 'aiml',
    title: 'Machine Learning & AI Techniques Quiz',
    questions: [
      {
        prompt: 'What distinguishes Supervised Machine Learning from Unsupervised Learning?',
        answers: [
          'Supervised learning trains models on labeled input-output data, while unsupervised finds patterns in unlabeled data',
          'Supervised learning runs only on supercomputers with GPUs',
          'Supervised learning requires zero training datasets',
        ],
        correctAnswer: 0,
        explanation: 'According to Machine Learning Unit II notes, supervised learning uses labeled examples (e.g. tagged cat/dog images) to predict outcomes on new data.',
      },
      {
        prompt: 'What is "self-healing" automation in AI-driven software testing?',
        answers: [
          'Automatically fixing compiler syntax errors in C++',
          'Locators adapting dynamically using similarity matching when UI element IDs or styles change',
          'Repairing corrupted hard drives on cloud servers',
        ],
        correctAnswer: 1,
        explanation: 'According to AI Software Testing Unit III notes (Page 4), self-healing test automation learns multiple attributes of UI elements and adapts locators instead of failing when IDs change.',
      },
      {
        prompt: 'Which supervised learning algorithm uses hyperplanes to maximize margins between classes?',
        answers: [
          'Support Vector Machine (SVM)',
          'K-Means Clustering',
          'Apriori Association Algorithm',
        ],
        correctAnswer: 0,
        explanation: 'A Support Vector Machine (SVM) finds the optimal hyperplane that separates data classes with maximum geometric margin.',
      },
      {
        prompt: 'How does ML-based defect prediction improve quality assurance?',
        answers: [
          'It replaces the need for any human testing team',
          'It analyzes code complexity, churn, and bug history to focus deep testing on high-risk modules',
          'It automatically deletes buggy files from git repositories',
        ],
        correctAnswer: 1,
        explanation: 'ML-based defect prediction analyzes metrics like cyclomatic complexity and past bug frequency to prioritize testing effort where bugs are statistically most likely.',
      },
    ],
  },
  'statistic': {
    subject: 'statistic',
    title: 'Statistics & Central Tendency Quiz',
    questions: [
      {
        prompt: 'What is the Arithmetic Mean of ungrouped data?',
        answers: [
          'The middle-most observation when data is arranged in order',
          'The ratio of the sum of observations to the total number of observations',
          'The observation that occurs with the highest frequency',
        ],
        correctAnswer: 1,
        explanation: 'According to Statistics Unit II notes, the Arithmetic Mean is calculated by dividing the sum of all observations by the total count of observations.',
      },
      {
        prompt: 'Which measure of central tendency represents the most frequently occurring value?',
        answers: ['Mean', 'Median', 'Mode'],
        correctAnswer: 2,
        explanation: 'Mode is defined as the value or variable that occurs the maximum number of times in a dataset.',
      },
      {
        prompt: 'What is the empirical relationship connecting Mean, Median, and Mode in a moderately skewed distribution?',
        answers: [
          'Mode = 3 Median - 2 Mean',
          'Mean = 3 Mode - 2 Median',
          'Median = Mean + Mode',
        ],
        correctAnswer: 0,
        explanation: 'The classic Karl Pearson empirical formula is: Mean - Mode = 3(Mean - Median), which rearranges to: Mode = 3 Median - 2 Mean.',
      },
      {
        prompt: 'What type of variable is the "number of computers in a lab"?',
        answers: ['Discrete variable', 'Continuous variable', 'Qualitative attribute'],
        correctAnswer: 0,
        explanation: 'Discrete variables take countable, whole-number values (e.g., 5 or 10 computers; you cannot have 5.4 computers).',
      },
    ],
  },
  'python': {
    subject: 'python',
    title: 'Python Loops & Control Flow Quiz',
    questions: [
      {
        prompt: 'What does the "continue" statement do inside a Python loop?',
        answers: [
          'Exits the loop immediately and moves past the loop block',
          'Skips the rest of the current iteration and jumps to the next iteration',
          'Restarts the entire script from line 1',
        ],
        correctAnswer: 1,
        explanation: 'In Python, continue skips the remaining code inside the current loop body and proceeds to evaluate the next cycle.',
      },
      {
        prompt: 'When does an "else" clause attached to a Python for loop execute?',
        answers: [
          'Only when the loop encounters a break statement',
          'When the loop finishes normally without being interrupted by a break',
          'Never; Python loops do not support else clauses',
        ],
        correctAnswer: 1,
        explanation: 'A loop else clause executes after the loop completes all its iterations, but is bypassed if the loop was terminated via break.',
      },
      {
        prompt: 'Which built-in function returns both the index and the item during a loop iteration?',
        answers: ['enumerate()', 'zip()', 'range()'],
        correctAnswer: 0,
        explanation: 'enumerate(iterable) yields tuple pairs of (index, item) throughout the loop.',
      },
    ],
  },
  'cloud': {
    subject: 'cloud',
    title: 'Cloud Computing & Virtualization Quiz',
    questions: [
      {
        prompt: 'What is a Type 1 (Bare-Metal) Hypervisor?',
        answers: [
          'A hypervisor that runs directly on physical server hardware without a host OS (e.g. VMware ESXi)',
          'A desktop application running inside Windows (e.g. VirtualBox)',
          'A web browser extension for cloud monitoring',
        ],
        correctAnswer: 0,
        explanation: 'According to Unit V notes (Page 13), a Type 1 Bare-Metal hypervisor runs directly on the physical hardware without a host OS, providing high performance in cloud data centers.',
      },
      {
        prompt: 'Which NIST cloud service model provides virtualized servers, storage, and networking over the internet?',
        answers: [
          'Infrastructure as a Service (IaaS)',
          'Software as a Service (SaaS)',
          'Platform as a Service (PaaS)',
        ],
        correctAnswer: 0,
        explanation: 'IaaS provides fundamental compute, storage, and network resources where the customer can deploy and run arbitrary software and operating systems.',
      },
      {
        prompt: 'What is the primary architectural benefit of OS-level virtualization such as Docker containers?',
        answers: [
          'They emulate a physical BIOS and complete hardware layer',
          'Multiple isolated user-space containers share the host operating system kernel instead of running full guest OSs',
          'They eliminate the need for server memory and CPU',
        ],
        correctAnswer: 1,
        explanation: 'According to Cloud Computing Unit V notes, OS-level virtualization allows multiple isolated instances to share the same host kernel, making them lightweight and fast.',
      },
    ],
  },
}

// Aliases for matching queries
const SUBJECT_ALIASES: Record<string, string> = {
  'software': 'software engineering',
  'se': 'software engineering',
  'software engineering': 'software engineering',
  'sdlc': 'software engineering',
  'srs': 'software engineering',
  'machine learning': 'aiml',
  'ml': 'aiml',
  'ai': 'aiml',
  'aiml': 'aiml',
  'testing': 'aiml',
  'stats': 'statistic',
  'statistic': 'statistic',
  'statistics': 'statistic',
  'math': 'statistic',
  'mathematics': 'statistic',
  'python': 'python',
  'loop': 'python',
  'loops': 'python',
  'cloud': 'cloud',
  'cloud computing': 'cloud',
  'virtualization': 'cloud',
  'aws': 'cloud',
}

export function detectQuizSubject(query: string): string {
  const lower = query.toLowerCase()
  for (const [key, subj] of Object.entries(SUBJECT_ALIASES)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(lower)) {
      return subj
    }
  }
  return 'software engineering'
}

export async function generateQuizForSubject(
  subjectOrQuery: string,
  userPrompt?: string
): Promise<GeneratedQuiz> {
  const detectedSubject = detectQuizSubject(subjectOrQuery)
  const defaultQuiz = BUILTIN_QUIZ_BANKS[detectedSubject] || BUILTIN_QUIZ_BANKS['software engineering']

  // If Gemini API key is configured, generate dynamic questions using syllabus excerpts!
  if (env.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(env.geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      })

      const syllabusExcerpts = searchSyllabus(userPrompt || subjectOrQuery, undefined, 4)
      const contextText = syllabusExcerpts
        .map((m) => `[Source: ${m.title} Page ${m.page}]\n${m.snippet}`)
        .join('\n\n')

      const prompt = `You are an educational quiz generator for an accessible learning platform.
Create a high-quality 4-question multiple-choice practice quiz for the student.
Subject/Topic: "${subjectOrQuery}".

Reference syllabus notes:
${contextText}

Format your output strictly as a JSON object matching this schema:
{
  "subject": "${detectedSubject}",
  "title": "${subjectOrQuery.toUpperCase()} Practice Quiz",
  "questions": [
    {
      "prompt": "Clear, concise question?",
      "answers": ["Option A", "Option B", "Option C"],
      "correctAnswer": 0,
      "explanation": "Clear educational explanation."
    }
  ]
}

Ensure questions are direct, clear for screen readers, and have exactly 3 answer options each.
correctAnswer must be the 0-indexed number (0, 1, or 2) of the correct option.`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed.questions) && parsed.questions.length >= 2) {
        return {
          subject: detectedSubject,
          title: parsed.title || defaultQuiz.title,
          questions: parsed.questions,
        }
      }
    } catch (error) {
      console.warn('Gemini quiz generation failed, using curated syllabus quiz bank:', error)
    }
  }

  return defaultQuiz
}
