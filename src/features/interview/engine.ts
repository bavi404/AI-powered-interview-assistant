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
  const { difficulty, seconds } = getDifficultyByStep(step)
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
  dispatch(
    setSummary({
      candidateId,
      summary: {
        score: sum.overallScore,
        level: sum.level,
        strengths: sum.strengths,
        improvements: sum.improvements,
        overview: sum.summary,
      },
    })
  )
  dispatch(setStage({ candidateId, stage: 'completed' }))
}
