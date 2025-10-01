import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface UiState {
  themeMode: ThemeMode
  sidebarOpen: boolean
}

const initialState: UiState = {
  themeMode: 'system',
  sidebarOpen: true,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
  },
})

export const { setThemeMode, toggleSidebar, setSidebarOpen } = uiSlice.actions
export default uiSlice.reducer
