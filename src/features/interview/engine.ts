import { AppDispatch } from '@/store'
import { RootState } from '@/store'
import {
  addQuestion,
  setStage,
  updateAnswerScore,
  setSummary,
} from '@/store/slices/interviewsSlice'
import type { Difficulty } from '@/domain/types'
import { llm } from '@/services/llm/LLMProvider'
import {
  buildQuestionPrompt,
  QuestionOutSchema,
  safeParseJSON,
  buildScorePrompt,
  ScoreOutSchema,
  buildSummaryPrompt,
  SummaryOutSchema,
} from '@/services/llm/prompts'
import { pushChatMessage } from '@/store/slices/interviewsSlice'

export function getDifficultyByStep(stepIndex: number): {
  difficulty: Difficulty
  seconds: number
} {
  if (stepIndex <= 1) return { difficulty: 'easy', seconds: 20 }
  if (stepIndex <= 3) return { difficulty: 'medium', seconds: 60 }
  return { difficulty: 'hard', seconds: 120 }
}

export async function nextQuestion(
  candidateId: string,
  dispatch: AppDispatch,
  getState: () => RootState
) {
  const state = getState()
  const interview = state.interviews[candidateId]
  if (!interview) return
  const step = interview.stepIndex
  const { difficulty, seconds } = computeAdaptiveNextDifficulty(candidateId, getState)
  const profile = state.candidates.byId[candidateId]
  const previousQA = interview.questions
    .slice(0, step)
    .map((q, idx) => ({ question: q.text, answer: interview.answers[idx]?.text }))
  const { system, user } = buildQuestionPrompt(profile, difficulty, previousQA)
  const raw = await llm.complete(system, user)
  const parsed = safeParseJSON(raw, QuestionOutSchema)
  dispatch(
    addQuestion({
      candidateId,
      question: {
        id: parsed.id,
        difficulty: parsed.difficulty,
        text: parsed.text,
        seconds: parsed.seconds ?? seconds,
        rubric: parsed.rubric,
      },
    })
  )
}

export async function scoreAnswer(
  candidateId: string,
  answerId: string,
  dispatch: AppDispatch,
  getState: () => RootState
) {
  const state = getState()
  const interview = state.interviews[candidateId]
  const answer = interview.answers.find(a => a.id === answerId)
  if (!answer) return
  const question = interview.questions.find(q => q.id === answer.questionId)
  if (!question) return
  const { system, user } = buildScorePrompt(question, { text: answer.text })
  const raw = await llm.complete(system, user)
  const score = safeParseJSON(raw, ScoreOutSchema)
  dispatch(
    updateAnswerScore({ candidateId, answerId, score: score.score, feedback: score.feedback })
  )
  // Feedback bubble
  dispatch(
    pushChatMessage({
      candidateId,
      message: {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: score.feedback,
        timestamp: new Date().toISOString(),
      },
    })
  )
}

export async function maybeSummarize(
  candidateId: string,
  dispatch: AppDispatch,
  getState: () => RootState
) {
  const state = getState()
  const interview = state.interviews[candidateId]
  if (!interview) return
  if (interview.stepIndex < 6) return
  const profile = state.candidates.byId[candidateId]
  const qa = interview.answers.map((a, i) => ({
    question: interview.questions[i]?.text ?? '',
    score: a.score ?? 0,
    feedback: a.feedback,
  }))
  const { system, user } = buildSummaryPrompt(qa, profile)
  const raw = await llm.complete(system, user)
  const sum = safeParseJSON(raw, SummaryOutSchema)
  // Compute badges
  const scores = interview.answers.map(a => a.score ?? 0)
  const avg = scores.reduce((s, v) => s + v, 0) / (scores.length || 1)
  const mean = avg
  const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (scores.length || 1)
  const stddev = Math.sqrt(variance)
  const badges: string[] = []
  // Quick Thinker: elapsed <5s and score>=8
  const quick = interview.answers.some(a => (a.elapsedSeconds || 9999) < 5 && (a.score ?? 0) >= 8)
  if (quick) badges.push('Quick Thinker')
  // Consistent Performer: stddev <1.5 and avg>=7.5
  if (stddev < 1.5 && avg >= 7.5) badges.push('Consistent Performer')
  // Hard Question Hero: any hard = 10
  const hardHero = interview.answers.some(
    (a, i) => interview.questions[i]?.difficulty === 'hard' && (a.score ?? 0) === 10
  )
  if (hardHero) badges.push('Hard Question Hero')

  dispatch(
    setSummary({
      candidateId,
      summary: {
        score: sum.overallScore,
        level: sum.level,
        strengths: sum.strengths,
        improvements: sum.improvements,
        overview: sum.summary,
        badges,
        alteredPath: interview.meta?.alteredPath ?? false,
      },
    })
  )
  dispatch(setStage({ candidateId, stage: 'completed' }))
}

export function computeAdaptiveNextDifficulty(candidateId: string, getState: () => RootState) {
  const state = getState()
  const interview = state.interviews[candidateId]
  const step = interview?.stepIndex ?? 0
  if (step < 2) return getDifficultyByStep(step)
  // After easy questions (0,1) scored 9+, skip one medium and add extra hard later
  const firstTwo = interview?.answers.slice(0, 2) ?? []
  const bothHigh = firstTwo.length === 2 && firstTwo.every(a => (a.score ?? 0) >= 9)
  if (bothHigh) {
    // mark altered path
    interview!.meta = { ...(interview!.meta || {}), alteredPath: true }
    if (step === 2) return { difficulty: 'hard' as Difficulty, seconds: 120 }
  }
  return getDifficultyByStep(step)
}
