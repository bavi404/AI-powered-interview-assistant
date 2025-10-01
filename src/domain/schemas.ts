import { z } from 'zod'

export const CandidateIdSchema = z.string().uuid()

export const DifficultySchema = z.enum(['easy', 'medium', 'hard'])

export const QuestionSchema = z.object({
  id: z.string().uuid(),
  difficulty: DifficultySchema,
  text: z.string().min(1),
  seconds: z.number().int().positive(),
  rubric: z.string().optional(),
})

export const AnswerSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
  text: z.string().default(''),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
  elapsedSeconds: z.number().int().min(0),
  autoSubmitted: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
})

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['system', 'assistant', 'user']),
  content: z.string(),
  timestamp: z.string(),
})

export const CandidateProfileSchema = z.object({
  id: CandidateIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  resumeMeta: z
    .object({ filename: z.string(), size: z.number().int().min(0), type: z.string() })
    .optional(),
  skills: z.array(z.string()).optional(),
  years: z.number().int().min(0).optional(),
  notes: z.string().optional(),
})

export const InterviewStageSchema = z.enum(['collecting_profile', 'running', 'completed', 'paused'])

export const InterviewTimerStateSchema = z.object({
  questionId: z.string().uuid().nullable(),
  remaining: z.number().int().min(0),
  paused: z.boolean(),
})

export const InterviewSummarySchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['Beginner', 'Intermediate', 'Expert']),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  overview: z.string(),
})

export const InterviewStateSchema = z.object({
  candidateId: CandidateIdSchema,
  stage: InterviewStageSchema,
  stepIndex: z.number().int().min(0).max(5),
  timer: InterviewTimerStateSchema,
  messages: z.array(ChatMessageSchema),
  questions: z.array(QuestionSchema),
  answers: z.array(AnswerSchema),
  summary: InterviewSummarySchema.optional(),
})

export const DashboardStateSchema = z.object({
  selectedCandidateId: CandidateIdSchema.optional(),
  sortBy: z.enum(['score', 'date', 'name']),
  sortDir: z.enum(['asc', 'desc']),
  search: z.string(),
})

export const AppUiStateSchema = z.object({
  theme: z.enum(['light', 'dark']),
  welcomeBackFor: CandidateIdSchema.optional(),
})

export const AppStateSchema = z.object({
  candidates: z.record(CandidateIdSchema, CandidateProfileSchema),
  interviews: z.record(CandidateIdSchema, InterviewStateSchema),
  order: z.array(CandidateIdSchema),
  lastActiveCandidateId: CandidateIdSchema.optional(),
  ui: AppUiStateSchema,
})

export type CandidateId = z.infer<typeof CandidateIdSchema>
export type Difficulty = z.infer<typeof DifficultySchema>
export type Question = z.infer<typeof QuestionSchema>
export type Answer = z.infer<typeof AnswerSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>
export type InterviewState = z.infer<typeof InterviewStateSchema>
export type DashboardState = z.infer<typeof DashboardStateSchema>
export type AppState = z.infer<typeof AppStateSchema>
