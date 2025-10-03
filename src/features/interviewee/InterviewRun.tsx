import { useMemo, useState } from 'react'
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

export function InterviewRun({ candidateId }: { candidateId: string }) {
  const dispatch = useAppDispatch()
  const interview = useAppSelector(s => s.interviews[candidateId])
  const step = interview?.stepIndex ?? 0
  const question = interview?.questions[step]
  const timer = interview?.timer
  const [text, setText] = useState('')

  useInterviewClock(candidateId)

  const progress = useMemo(() => `${Math.min(step + 1, 6)}/6`, [step])

  // Ensure question exists when entering running stage
  useMemo(() => {
    if (!question && interview?.stage === 'running') {
      void nextQuestion(candidateId, dispatch, () => store.getState())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview?.stage, question])

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
        <textarea
          className="min-h-24 w-full rounded-md border bg-background p-2 text-sm"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your answer…"
          disabled={!question || (timer?.remaining ?? 0) <= 0}
        />
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
