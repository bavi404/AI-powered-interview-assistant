import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { CandidateId } from '@/domain/types'

export interface AppUiState {
  theme: 'light' | 'dark'
  welcomeBackFor?: CandidateId
}

export interface AppSliceState {
  lastActiveCandidateId?: CandidateId
  ui: AppUiState
}

const initialState: AppSliceState = {
  lastActiveCandidateId: undefined,
  ui: { theme: 'light', welcomeBackFor: undefined },
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setWelcomeBack(state, action: PayloadAction<CandidateId | undefined>) {
      state.ui.welcomeBackFor = action.payload
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.ui.theme = action.payload
    },
    setLastActiveCandidate(state, action: PayloadAction<CandidateId | undefined>) {
      state.lastActiveCandidateId = action.payload
    },
  },
})

export const { setWelcomeBack, setTheme, setLastActiveCandidate } = appSlice.actions
export default appSlice.reducer
