import { z } from 'zod'
import type { CandidateProfile, Difficulty, Question } from '@/domain/types'

export function buildQuestionPrompt(
  profile: CandidateProfile,
  difficulty: Difficulty,
  previousQA: Array<{ question: string; answer?: string }>
) {
  const system = `You are an interviewer for a Full Stack (React/Node) role. Ask one ${difficulty} difficulty question.
- Focus on React, Node.js, TypeScript, HTTP, performance, testing, or system design at appropriate depth.
- Include a short rubric and key points. Return strict JSON.`

  const user = JSON.stringify({
    profile: {
      name: profile.name,
      skills: profile.skills ?? [],
      years: profile.years ?? 0,
    },
    previousQA,
    format: {
      id: 'uuid',
      difficulty,
      text: 'string',
      seconds: 120,
      rubric: 'string',
      keyPoints: ['array of strings'],
    },
  })

  return { system, user }
}

export const QuestionOutSchema = z.object({
  id: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  text: z.string(),
  seconds: z.number().int().positive(),
  rubric: z.string().optional(),
  keyPoints: z.array(z.string()).default([]),
})

export function buildScorePrompt(question: Question, answer: { text: string }) {
  const system = `You are evaluating an interview answer. Score from 0 to 10.
Provide 2-sentence feedback and list missing key points. Return strict JSON.`

  const user = JSON.stringify({
    question: { text: question.text, rubric: question.rubric },
    answer: answer.text,
    format: { score: 0, feedback: 'string', missing: ['array of strings'] },
  })
  return { system, user }
}

export const ScoreOutSchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z.string(),
  missing: z.array(z.string()).default([]),
})

export function buildSummaryPrompt(
  allQA: Array<{ question: string; score: number; feedback?: string }>,
  profile: CandidateProfile
) {
  const system = `You are summarizing an interview. Provide:
- overallScore (0..100), level (Beginner|Intermediate|Expert),
- strengths, improvements, and a 4–5 sentence summary with a tailored learning plan.
Return strict JSON.`
  const user = JSON.stringify({
    profile: { name: profile.name, skills: profile.skills ?? [], years: profile.years ?? 0 },
    qa: allQA,
    format: {
      overallScore: 0,
      level: 'Beginner',
      strengths: ['array of strings'],
      improvements: ['array of strings'],
      summary: 'string',
      plan: ['array of strings'],
    },
  })
  return { system, user }
}

export const SummaryOutSchema = z.object({
  overallScore: z.number().min(0).max(100),
  level: z.enum(['Beginner', 'Intermediate', 'Expert']),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  summary: z.string(),
  plan: z.array(z.string()),
})

export function safeParseJSON<T>(text: string, schema: z.ZodSchema<T>): T {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  const candidate = first >= 0 && last >= 0 ? text.slice(first, last + 1) : text
  const parsed = JSON.parse(candidate)
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error('LLM output validation failed: ' + result.error.message)
  }
  return result.data
}
