import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { submitAnswer } from '@/store/slices/interviewsSlice'
import { useInterviewClock } from '@/features/interview/useInterviewClock'
import {
  nextQuestion,
  scoreAnswer,
  maybeSummarize,
  getDifficultyByStep,
} from '@/features/interview/engine'
import { pauseInterview, resumeInterview } from '@/store/slices/interviewsSlice'
import { store } from '@/store'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { Mic, MicOff } from 'lucide-react'

export function InterviewRun({ candidateId }: { candidateId: string }) {
  const dispatch = useAppDispatch()
  const interview = useAppSelector(s => s.interviews[candidateId])
  const step = interview?.stepIndex ?? 0
  const question = interview?.questions[step]
  const timer = interview?.timer
  const [text, setText] = useState('')
  const { listening, transcript, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition()
  const [recElapsed, setRecElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const recStartRef = useRef<number | null>(null)

  useInterviewClock(candidateId)

  const progress = useMemo(() => `${Math.min(step + 1, 6)}/6`, [step])

  // Ensure question exists when entering running stage
  useMemo(() => {
    if (!question && interview?.stage === 'running') {
      void nextQuestion(candidateId, dispatch, () => store.getState())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview?.stage, question])

  // Stream transcript into textarea while recording
  useEffect(() => {
    if (listening) {
      setText(prev => (transcript && transcript.length > prev.length ? transcript : prev))
    }
  }, [listening, transcript])

  // Mic level + elapsed timer
  useEffect(() => {
    let intervalId: number | undefined
    const stopMeters = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      analyserRef.current = null
    }
    const tickMeters = () => {
      if (!analyserRef.current) return
      const analyser = analyserRef.current
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      setLevel(Math.min(1, rms * 4))
      rafRef.current = requestAnimationFrame(tickMeters)
    }
    const startMeters = async () => {
      try {
        const W = window as unknown as { webkitAudioContext?: typeof AudioContext }
        const Ctor = (window.AudioContext || W.webkitAudioContext) as typeof AudioContext
        audioCtxRef.current = new Ctor()
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const source = audioCtxRef.current.createMediaStreamSource(stream)
        analyserRef.current = audioCtxRef.current.createAnalyser()
        analyserRef.current.fftSize = 2048
        source.connect(analyserRef.current)
        tickMeters()
      } catch {
        // ignore
      }
    }

    if (listening) {
      recStartRef.current = Date.now()
      intervalId = window.setInterval(() => {
        if (recStartRef.current)
          setRecElapsed(Math.floor((Date.now() - recStartRef.current) / 1000))
      }, 1000)
      void startMeters()
    } else {
      setRecElapsed(0)
      stopMeters()
      recStartRef.current = null
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
      stopMeters()
    }
  }, [listening])

  // Hotkey Ctrl+M to toggle mic
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        handleToggleMic()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handleToggleMic = () => {
    if (!browserSupportsSpeechRecognition) return
    if (!listening) {
      resetTranscript()
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
    } else {
      SpeechRecognition.stopListening()
    }
  }

  const onSubmit = async () => {
    if (!interview || !question) return
    const answerId = crypto.randomUUID()
    dispatch(
      submitAnswer({
        candidateId,
        answer: {
          id: answerId,
          questionId: question.id,
          text,
          startedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          elapsedSeconds: (getDifficultyByStep(step).seconds - (timer?.remaining ?? 0)) | 0,
        },
      })
    )
    setText('')
    resetTranscript()
    await scoreAnswer(candidateId, answerId, dispatch, () => store.getState())
    if (step + 1 < 6) {
      await nextQuestion(candidateId, dispatch, () => store.getState())
    } else {
      await maybeSummarize(candidateId, dispatch, () => store.getState())
    }
  }

  if (!interview || interview.stage !== 'running') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question {step + 1}</span>
          <Badge>{question?.difficulty ?? getDifficultyByStep(step).difficulty}</Badge>
        </CardTitle>
        <CardDescription className="flex items-center justify-between gap-2">
          <span>
            Time: {timer?.remaining ?? getDifficultyByStep(step).seconds}s • Progress {progress}
          </span>
          {interview.stage === 'running' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch(pauseInterview({ candidateId }))}
            >
              Pause
            </Button>
          ) : (
            <Button size="sm" onClick={() => dispatch(resumeInterview({ candidateId }))}>
              Resume
            </Button>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-16 whitespace-pre-wrap text-sm">
          {question?.text ?? 'Generating question…'}
        </div>
        <div className="space-y-2">
          <textarea
            className="min-h-24 w-full rounded-md border bg-background p-2 text-sm"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type your answer…"
            disabled={!question || (timer?.remaining ?? 0) <= 0}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                aria-label="mic level"
                className="h-2 w-24 overflow-hidden rounded bg-muted"
                title={`Level: ${Math.round(level * 100)}%`}
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.round(level * 100)}%` }}
                />
              </div>
              <span>{listening ? `Recording… ${recElapsed}s` : 'Mic off'}</span>
              <span>(Ctrl+M)</span>
            </div>
            <Button
              type="button"
              variant={listening ? 'destructive' : 'secondary'}
              size="sm"
              onClick={handleToggleMic}
              disabled={!browserSupportsSpeechRecognition}
            >
              {listening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {listening ? 'Stop' : 'Record'}
            </Button>
          </div>
        </div>
        <Button
          onClick={onSubmit}
          disabled={!question || (timer?.remaining ?? 0) <= 0 || !text.trim()}
        >
          Submit
        </Button>
      </CardContent>
    </Card>
  )
}
