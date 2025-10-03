import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { persistor, store } from '@/store'
import { setWelcomeBack } from '@/store/slices/appSlice'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistor}
        onBeforeLift={() => {
          const state = store.getState()
          const entry = Object.values(state.interviews).find(i => i.stage !== 'completed')
          if (entry) {
            store.dispatch(setWelcomeBack(entry.candidateId))
          }
        }}
      >
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>
)
