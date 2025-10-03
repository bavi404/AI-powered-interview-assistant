import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { tickTimer } from '@/store/slices/interviewsSlice'

export function useInterviewClock(candidateId?: string) {
  const dispatch = useAppDispatch()
  const interview = useAppSelector(s => (candidateId ? s.interviews[candidateId] : undefined))
  const stage = interview?.stage

  useEffect(() => {
    if (!candidateId || !stage) return
    if (stage !== 'running') return
    const id = window.setInterval(() => {
      dispatch(tickTimer({ candidateId }))
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [candidateId, stage, dispatch])
}
