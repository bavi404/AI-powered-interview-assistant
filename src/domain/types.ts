export type CandidateId = string

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  difficulty: Difficulty
  text: string
  seconds: number
  rubric?: string
}

export interface Answer {
  id: string
  questionId: string
  text: string
  startedAt: string
  submittedAt: string | null
  elapsedSeconds: number
  autoSubmitted?: boolean
  score?: number
  feedback?: string
}

export type ChatRole = 'system' | 'assistant' | 'user'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
}

export interface CandidateProfile {
  id: CandidateId
  name: string
  email: string
  phone: string
  resumeMeta?: { filename: string; size: number; type: string }
  skills?: string[]
  years?: number
  notes?: string
}

export type InterviewStage = 'collecting_profile' | 'running' | 'completed' | 'paused'

export interface InterviewTimerState {
  questionId: string | null
  remaining: number
  paused: boolean
}

export interface InterviewSummary {
  score: number
  level: 'Beginner' | 'Intermediate' | 'Expert'
  strengths: string[]
  improvements: string[]
  overview: string
}

export interface InterviewState {
  candidateId: CandidateId
  stage: InterviewStage
  stepIndex: number
  timer: InterviewTimerState
  messages: ChatMessage[]
  questions: Question[]
  answers: Answer[]
  summary?: InterviewSummary
}

export interface DashboardState {
  selectedCandidateId?: CandidateId
  sortBy: 'score' | 'date' | 'name'
  sortDir: 'asc' | 'desc'
  search: string
}

export interface AppUiState {
  theme: 'light' | 'dark'
  welcomeBackFor?: CandidateId
}

export interface AppState {
  candidates: Record<CandidateId, CandidateProfile>
  interviews: Record<CandidateId, InterviewState>
  order: CandidateId[]
  lastActiveCandidateId?: CandidateId
  ui: AppUiState
}
