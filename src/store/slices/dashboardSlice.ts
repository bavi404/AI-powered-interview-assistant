import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { CandidateId } from '@/domain/types'

export interface DashboardState {
  selectedCandidateId?: CandidateId
  sortBy: 'score' | 'date' | 'name'
  sortDir: 'asc' | 'desc'
  search: string
}

const initialState: DashboardState = {
  selectedCandidateId: undefined,
  sortBy: 'date',
  sortDir: 'desc',
  search: '',
}

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    selectCandidate(state, action: PayloadAction<CandidateId | undefined>) {
      state.selectedCandidateId = action.payload
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    setSort(
      state,
      action: PayloadAction<{ sortBy: 'score' | 'date' | 'name'; sortDir: 'asc' | 'desc' }>
    ) {
      state.sortBy = action.payload.sortBy
      state.sortDir = action.payload.sortDir
    },
  },
})

export const { selectCandidate, setSearch, setSort } = dashboardSlice.actions
export default dashboardSlice.reducer
