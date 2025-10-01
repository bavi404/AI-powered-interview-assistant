import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  Answer,
  CandidateId,
  ChatMessage,
  InterviewState,
  InterviewSummary,
  Question,
} from '@/domain/types'

export type InterviewsState = Record<CandidateId, InterviewState>

const initialState: InterviewsState = {}

function ensureInterview(state: InterviewsState, candidateId: CandidateId): InterviewState {
  if (!state[candidateId]) {
    state[candidateId] = {
      candidateId,
      stage: 'collecting_profile',
      stepIndex: 0,
      timer: { questionId: null, remaining: 0, paused: true },
      messages: [],
      questions: [],
      answers: [],
    }
  }
  return state[candidateId]
}

export const interviewsSlice = createSlice({
  name: 'interviews',
  initialState,
  reducers: {
    startInterview(state, action: PayloadAction<{ candidateId: CandidateId }>) {
      const { candidateId } = action.payload
      const interview = ensureInterview(state, candidateId)
      interview.stage = 'running'
      interview.stepIndex = 0
    },
    pauseInterview(state, action: PayloadAction<{ candidateId: CandidateId }>) {
      const interview = ensureInterview(state, action.payload.candidateId)
      interview.stage = 'paused'
      interview.timer.paused = true
    },
    resumeInterview(state, action: PayloadAction<{ candidateId: CandidateId }>) {
      const interview = ensureInterview(state, action.payload.candidateId)
      interview.stage = 'running'
      interview.timer.paused = false
    },
    completeInterview(state, action: PayloadAction<{ candidateId: CandidateId }>) {
      const interview = ensureInterview(state, action.payload.candidateId)
      interview.stage = 'completed'
      interview.timer.paused = true
    },
    resetInterview(state, action: PayloadAction<{ candidateId: CandidateId }>) {
      state[action.payload.candidateId] = {
        candidateId: action.payload.candidateId,
        stage: 'collecting_profile',
        stepIndex: 0,
        timer: { questionId: null, remaining: 0, paused: true },
        messages: [],
        questions: [],
        answers: [],
      }
    },
    pushChatMessage(
      state,
      action: PayloadAction<{ candidateId: CandidateId; message: ChatMessage }>
    ) {
      const { candidateId, message } = action.payload
      const interview = ensureInterview(state, candidateId)
      interview.messages.push(message)
    },
    addQuestion(state, action: PayloadAction<{ candidateId: CandidateId; question: Question }>) {
      const { candidateId, question } = action.payload
      const interview = ensureInterview(state, candidateId)
      interview.questions.push(question)
      interview.timer = { questionId: question.id, remaining: question.seconds, paused: false }
    },
    submitAnswer(
      state,
      action: PayloadAction<{
        candidateId: CandidateId
        answer: Omit<Answer, 'elapsedSeconds' | 'autoSubmitted'> & {
          elapsedSeconds: number
          autoSubmitted?: boolean
        }
      }>
    ) {
      const { candidateId, answer } = action.payload
      const interview = ensureInterview(state, candidateId)
      interview.answers.push(answer)
      if (interview.timer.questionId === answer.questionId) {
        interview.timer = { questionId: null, remaining: 0, paused: true }
      }
    },
    tickTimer(state, action: PayloadAction<{ candidateId: CandidateId }>) {
      const interview = ensureInterview(state, action.payload.candidateId)
      if (!interview.timer.paused && interview.timer.remaining > 0) {
        interview.timer.remaining -= 1
      }
      if (interview.timer.remaining <= 0 && interview.timer.questionId) {
        // auto submit
        const qid = interview.timer.questionId
        interview.answers.push({
          id: crypto.randomUUID(),
          questionId: qid,
          text: '',
          startedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          elapsedSeconds: 0,
          autoSubmitted: true,
        })
        interview.timer = { questionId: null, remaining: 0, paused: true }
      }
    },
    computeFinalScoreAndSummary(
      state,
      action: PayloadAction<{
        candidateId: CandidateId
        scorer?: (answers: Answer[]) => InterviewSummary
      }>
    ) {
      const { candidateId, scorer } = action.payload
      const interview = ensureInterview(state, candidateId)
      const defaultScorer = (answers: Answer[]): InterviewSummary => {
        const withScores = answers.filter(a => typeof a.score === 'number')
        const scoreAvg =
          withScores.length > 0
            ? Math.round(
                withScores.reduce((s, a) => s + (a.score as number), 0) / withScores.length
              )
            : 0
        const level = scoreAvg >= 75 ? 'Expert' : scoreAvg >= 50 ? 'Intermediate' : 'Beginner'
        return {
          score: scoreAvg,
          level,
          strengths: [],
          improvements: [],
          overview: 'Auto-generated summary',
        }
      }
      interview.summary = (scorer ?? defaultScorer)(interview.answers)
    },
  },
})

export const {
  startInterview,
  pauseInterview,
  resumeInterview,
  completeInterview,
  resetInterview,
  pushChatMessage,
  addQuestion,
  submitAnswer,
  tickTimer,
  computeFinalScoreAndSummary,
} = interviewsSlice.actions

export default interviewsSlice.reducer
