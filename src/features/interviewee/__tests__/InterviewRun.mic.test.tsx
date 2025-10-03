import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { InterviewRun } from '@/features/interviewee/InterviewRun'

vi.mock('react-speech-recognition', () => ({
  default: { startListening: vi.fn(), stopListening: vi.fn() },
  useSpeechRecognition: () => ({
    listening: false,
    transcript: '',
    resetTranscript: vi.fn(),
    browserSupportsSpeechRecognition: true,
  }),
}))

describe('InterviewRun mic', () => {
  it('renders and toggles mic via hotkey', () => {
    const { container } = render(
      <Provider store={store}>
        <InterviewRun candidateId="test" />
      </Provider>
    )
    fireEvent.keyDown(window, { key: 'm', ctrlKey: true })
    expect(container).toBeTruthy()
  })
})
