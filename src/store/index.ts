import { configureStore, ThunkAction, Action, combineReducers } from '@reduxjs/toolkit'
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import localforage from 'localforage'
import uiReducer from '@/store/slices/uiSlice'
import appReducer from '@/store/slices/appSlice'
import candidatesReducer from '@/store/slices/candidatesSlice'
import interviewsReducer from '@/store/slices/interviewsSlice'
import dashboardReducer from '@/store/slices/dashboardSlice'

// Configure localforage to use IndexedDB with a custom store name
localforage.config({
  name: 'interview-mind',
  storeName: 'app-storage',
  description: 'Persisted Redux state for Interview Mind application',
})

const rootReducer = combineReducers({
  ui: uiReducer,
  app: appReducer,
  candidates: candidatesReducer,
  interviews: interviewsReducer,
  dashboard: dashboardReducer,
})

export type RootState = ReturnType<typeof rootReducer>

const persistConfig = {
  key: 'root',
  version: 1,
  storage: localforage,
  throttle: 1000, // throttle writes to about once per second
  blacklist: [],
}

const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

export type AppDispatch = typeof store.dispatch
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>
