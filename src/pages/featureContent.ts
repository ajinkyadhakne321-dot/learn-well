import type { FeaturePageContent } from './FeaturePage'

export const featurePages: Record<string, FeaturePageContent> = {
  subjects: {
    title: 'Subjects', eyebrow: 'YOUR CLASSES', description: 'Explore your courses and see what you are studying this term.',
    items: [
      { title: 'Biology', detail: 'Cell structure, ecosystems, and genetics', meta: '8 lessons' },
      { title: 'Mathematics', detail: 'Algebra, fractions, and geometry', meta: '12 lessons' },
      { title: 'English Literature', detail: 'Reading, writing, and communication', meta: '6 lessons' },
      { title: 'Physics', detail: 'Motion, energy, and forces', meta: '9 lessons' },
    ],
  },
  materials: {
    title: 'Learning Materials', eyebrow: 'YOUR LIBRARY', description: 'Audio lessons, accessible readings, and practice activities in one place.',
    items: [
      { title: 'Cell Structure and Function', detail: 'Audio lesson · Biology', meta: '18 min' },
      { title: 'Linear Equations', detail: 'Practice set · Mathematics', meta: '8 questions' },
      { title: 'The Art of Persuasion', detail: 'Accessible reading · English', meta: '15 min' },
    ],
  },
  notes: {
    title: 'Notes', eyebrow: 'YOUR STUDY NOTES', description: 'Review your saved notes and class summaries.',
    items: [
      { title: 'The Water Cycle', detail: 'Earth Science · Updated yesterday', meta: '4 notes' },
      { title: 'Forces and Motion', detail: 'Physics · Updated September 29', meta: '3 notes' },
      { title: 'Vocabulary: Unit 3', detail: 'English · Updated September 26', meta: '12 terms' },
    ],
  },
  assignments: {
    title: 'Assignments', eyebrow: 'YOUR WORK', description: 'Keep track of upcoming due dates and recently completed work.',
    items: [
      { title: 'Lab report: plant cells', detail: 'Biology · Due today at 4:00 PM', meta: 'Assignment' },
      { title: 'Unit 3: fractions and ratios', detail: 'Mathematics · Due tomorrow at 10:30 AM', meta: 'Quiz' },
      { title: 'Persuasive essay outline', detail: 'English · Due Monday, October 5', meta: 'Assignment' },
    ],
  },
  quiz: {
    title: 'Quiz', eyebrow: 'PRACTICE AND REVIEW', description: 'Build confidence with short practice quizzes before class assessments.',
    items: [
      { title: 'Fractions and ratios', detail: 'Mathematics · 8 questions', meta: 'Due tomorrow' },
      { title: 'Vocabulary: Unit 3', detail: 'English · 10 questions', meta: 'Completed' },
      { title: 'Cell structures', detail: 'Biology · 6 questions', meta: 'Practice' },
    ],
  },
  assistant: {
    title: 'AI Assistant', eyebrow: 'STUDY SUPPORT', description: 'A future study companion for explaining, summarizing, and planning your learning.',
    items: [
      { title: 'Explain a topic', detail: 'Ask for a clear, step-by-step explanation.', meta: 'Not connected' },
      { title: 'Make a study plan', detail: 'Break a subject into smaller study sessions.', meta: 'Not connected' },
      { title: 'Summarize material', detail: 'Review key ideas from a lesson or reading.', meta: 'Not connected' },
    ],
  },
  calendar: {
    title: 'Calendar', eyebrow: 'YOUR SCHEDULE', description: 'A simple view of the next few learning milestones.',
    items: [
      { title: 'Lab report: plant cells', detail: 'Friday, October 2 · Biology', meta: '4:00 PM' },
      { title: 'Fractions and ratios quiz', detail: 'Saturday, October 3 · Mathematics', meta: '10:30 AM' },
      { title: 'Essay outline', detail: 'Monday, October 5 · English', meta: '11:59 PM' },
    ],
  },
  progress: {
    title: 'Progress', eyebrow: 'YOUR LEARNING JOURNEY', description: 'See a snapshot of your activity and learning milestones.',
    items: [
      { title: 'Overall course progress', detail: '24 of 35 lessons completed', meta: '68 percent' },
      { title: 'Practice sessions', detail: 'You completed 12 sessions this month', meta: 'This month' },
      { title: 'Learning streak', detail: 'You studied on four consecutive days', meta: '4 days' },
    ],
  },
  accessibility: {
    title: 'Accessibility Settings', eyebrow: 'MAKE LEARNING YOURS', description: 'Accessibility features in this preview are represented as sample settings.',
    items: [
      { title: 'High contrast', detail: 'Text and interface elements use high-contrast colors.', meta: 'On' },
      { title: 'Keyboard navigation', detail: 'All links and controls can be reached by keyboard.', meta: 'Available' },
      { title: 'Screen reader labels', detail: 'Landmarks, headings, and controls have accessible names.', meta: 'Available' },
      { title: 'Reduced motion', detail: 'The interface avoids essential motion and animation.', meta: 'Respected' },
    ],
  },
  help: {
    title: 'Help', eyebrow: 'SUPPORT', description: 'Find your way around the learning platform and its accessibility features.',
    items: [
      { title: 'Using keyboard navigation', detail: 'Move through the interface with Tab, Shift+Tab, and Enter.', meta: 'Guide' },
      { title: 'Screen reader access', detail: 'Use headings and landmarks to navigate each page.', meta: 'Guide' },
      { title: 'Contact student support', detail: 'Support contact details will appear in a future version.', meta: 'Coming later' },
    ],
  },
  logout: {
    title: 'Logout', eyebrow: 'PREVIEW MODE', description: 'Account actions are not enabled in this prototype.',
    items: [{ title: 'No active session', detail: 'This sample platform does not use authentication.', meta: 'Prototype' }],
  },
  notFound: {
    title: 'Page not found', eyebrow: 'NOT HERE', description: 'That page is not part of this prototype.',
    items: [{ title: 'Return to your dashboard', detail: 'Use the dashboard to continue exploring.', meta: 'Home' }],
  },
}