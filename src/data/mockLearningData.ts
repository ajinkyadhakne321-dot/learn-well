export type Subject = {
  id: string
  name: string
  description: string
  unitCount: number
}

export type LearningMaterial = {
  id: string
  title: string
  subject: string
  format: string
  duration: string
  description: string
  fileUrl?: string
}

export type Assignment = {
  id: string
  title: string
  subject: string
  dueAt: string
  type: 'Assignment' | 'Quiz'
  fileUrl?: string
  description?: string
}

export type StudentNote = {
  id: string
  title: string
  subject: string
  content: string
  updatedAt: string
}

export const subjects: Subject[] = [
  { id: 'python', name: 'python', description: 'unit 1, unit 2, and unit 3', unitCount: 8 },
  { id: 'statistic', name: 'statistic', description: 'unit 1, unit 2, and unit 3', unitCount: 12 },
  { id: 'mathematics', name: 'mathematics', description: 'Mathematics & Statistics assignments and units', unitCount: 10 },
  { id: 'datastructure', name: 'datastructure', description: 'unit 1, unit 2, and unit 3', unitCount: 6 },
  { id: 'aiml', name: 'aiml', description: 'unit 1, unit 2, and unit 3', unitCount: 9 },
  { id: 'software engineering', name: 'software engineering', description: 'unit 1, unit 2, and unit 3', unitCount: 10 },
]

export const learningMaterials: LearningMaterial[] = [
  { id: 'material-1', title: 'loops', subject: 'python', format: 'Accessible reading', duration: '6 sections', description: 'Python for and while loops, control statements, nested loops, and looping utilities.' },
  { id: 'material-2', title: 'frequency distribution', subject: 'statistic', format: 'Practice set', duration: '8 questions', description: 'mean,median and mode' },
  {
    id: 'material-stat-unit-1',
    title: 'Unit I: Introduction to Statistics',
    subject: 'statistic',
    format: 'PDF document',
    duration: '28 pages',
    description: 'Introduction to statistics concepts, definitions, scope, and foundational principles.',
    fileUrl: '/materials/unit-1-introduction-to-statistics.pdf',
  },
  {
    id: 'material-stat-unit-2',
    title: 'Unit II: Measures of Central Tendency and Dispersion',
    subject: 'statistic',
    format: 'PDF document',
    duration: '25 pages',
    description: 'Detailed study of mean, median, mode, variance, and standard deviation measures.',
    fileUrl: '/materials/unit-2-central-tendency-and-dispersion.pdf',
  },
  {
    id: 'material-se-unit-1',
    title: 'Unit I: Introduction to Software Engineering',
    subject: 'software engineering',
    format: 'PDF document',
    duration: '87 pages',
    description: 'Fundamentals of software engineering, evolving role of software, layered technology, process frameworks, and SDLC models.',
    fileUrl: '/materials/se-unit-1-intro-to-software-engineering.pdf',
  },
  {
    id: 'material-se-unit-2',
    title: 'Unit II: Software Requirements Engineering',
    subject: 'software engineering',
    format: 'PDF document',
    duration: '79 pages',
    description: 'Systematic requirements engineering process, SRS structure, elicitation techniques, risk management, estimation, and Agile planning.',
    fileUrl: '/materials/se-unit-2-software-requirements-engineering.pdf',
  },
  { id: 'material-3', title: 'algorithm', subject: 'datastructure', format: 'Accessible reading', duration: '15 min', description: 'algorithms' },
  { id: 'material-4', title: 'linear reggression', subject: 'aiml', format: 'Audio lesson', duration: '21 min', description: 'linear regrression' },
  {
    id: 'material-aiml-unit-2',
    title: 'Unit II: Machine Learning Techniques & Algorithms',
    subject: 'aiml',
    format: 'PDF document',
    duration: '13 pages',
    description: 'Comprehensive study of supervised, unsupervised, and reinforcement learning, regression types, decision trees, bagging, and SVM.',
    fileUrl: '/materials/aiml-unit-2-machine-learning.pdf',
  },
  {
    id: 'material-aiml-unit-3',
    title: 'Unit III: AI Techniques for Software Testing',
    subject: 'aiml',
    format: 'PDF document',
    duration: '12 pages',
    description: 'AI-driven test case generation, self-healing test automation, ML-based defect prediction, and NLP in requirements analysis.',
    fileUrl: '/materials/aiml-unit-3-ai-techniques-for-software-testing.pdf',
  },
  {
    id: 'material-aiml-cloud',
    title: 'Fundamentals of Cloud Computing',
    subject: 'aiml',
    format: 'PDF document',
    duration: '15 pages',
    description: 'Cloud service models (IaaS, PaaS, SaaS), virtualization architectures, deployment models, and scalable AI infrastructure.',
    fileUrl: '/materials/fundamentals-of-cloud-computing.pdf',
  },
]

export const assignments: Assignment[] = [
  {
    id: 'assignment-math-1',
    title: 'Assignment I: Mathematics & Statistics',
    subject: 'mathematics',
    dueAt: '2026-10-14T17:00:00',
    type: 'Assignment',
    fileUrl: '/assignments/assignment-1-mathematics-statistics.pdf',
    description: 'Statistical concepts, data classification, variables, and histogram construction.',
  },
  {
    id: 'assignment-math-2',
    title: 'Assignment II: Probability & Statistics',
    subject: 'mathematics',
    dueAt: '2026-10-18T17:00:00',
    type: 'Assignment',
    fileUrl: '/assignments/assignment-2-probability-statistics.pdf',
    description: 'Arithmetic mean, median, mode, missing frequencies, and quartile calculations.',
  },
  { id: 'assignment-1', title: 'Lab report: plant cells', subject: 'python', dueAt: '2026-10-02T16:00:00', type: 'Assignment' },
  { id: 'assignment-2', title: 'Unit 3: fractions and ratios', subject: 'statistic', dueAt: '2026-10-03T10:30:00', type: 'Quiz' },
  { id: 'assignment-3', title: 'Persuasive essay outline', subject: 'datastructure', dueAt: '2026-10-05T23:59:00', type: 'Assignment' },
]

export const initialNotes: StudentNote[] = [
  { id: 'note-1', title: 'The Water Cycle', subject: 'Earth Science', content: 'Water moves through evaporation, condensation, precipitation, and collection. Energy from the sun drives evaporation.', updatedAt: 'October 1, 2026' },
  { id: 'note-2', title: 'Forces and Motion', subject: 'aiml', content: 'A force can change an object’s speed or direction. Balanced forces do not change motion.', updatedAt: 'September 29, 2026' },
  { id: 'note-3', title: 'Vocabulary: Unit 3', subject: 'English', content: 'Review the key terms from this unit before the next quiz.', updatedAt: 'September 26, 2026' },
]

export const quizQuestions = [
  {
    prompt: 'What is the value of x in 2x + 4 = 10?',
    answers: ['2', '3', '5'],
    correctAnswer: 1,
    explanation: 'Subtract 4 from both sides, then divide 6 by 2. So x = 3.',
  },
  {
    prompt: 'Which fraction is equivalent to 2/4?',
    answers: ['1/2', '2/3', '3/4'],
    correctAnswer: 0,
    explanation: 'Divide the numerator and denominator of 2/4 by 2 to get 1/2.',
  },
  {
    prompt: 'What should you do first to solve 5x = 20?',
    answers: ['Add 5 to both sides', 'Divide both sides by 5', 'Subtract 20 from both sides'],
    correctAnswer: 1,
    explanation: 'Divide both sides by 5 to isolate x.',
  },
]

export const calendarEvents = [
  { title: 'Assignment I: Mathematics & Statistics due', subject: 'mathematics', date: '2026-10-14', time: '5:00 PM' },
  { title: 'Assignment II: Probability & Statistics due', subject: 'mathematics', date: '2026-10-18', time: '5:00 PM' },
  { title: 'Lab report: plant cells', subject: 'python', date: '2026-10-02', time: '4:00 PM' },
  { title: 'Fractions and ratios quiz', subject: 'statistic', date: '2026-10-03', time: '10:30 AM' },
  { title: 'Persuasive essay outline', subject: 'datastructure', date: '2026-10-05', time: '11:59 PM' },
  { title: 'Forces and Motion review', subject: 'aiml', date: '2026-10-08', time: '1:00 PM' },
]