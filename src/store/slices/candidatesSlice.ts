import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { CandidateId, CandidateProfile } from '@/domain/types'

export interface CandidatesState {
  byId: Record<CandidateId, CandidateProfile>
  order: CandidateId[]
}

const initialState: CandidatesState = {
  byId: {},
  order: [],
}

export const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    upsertCandidate(state, action: PayloadAction<CandidateProfile>) {
      const candidate = action.payload
      state.byId[candidate.id] = candidate
      if (!state.order.includes(candidate.id)) {
        state.order.unshift(candidate.id)
      }
    },
    deleteCandidate(state, action: PayloadAction<CandidateId>) {
      const id = action.payload
      if (state.byId[id]) {
        delete state.byId[id]
        state.order = state.order.filter(x => x !== id)
      }
    },
  },
})

export const { upsertCandidate, deleteCandidate } = candidatesSlice.actions
export default candidatesSlice.reducer
