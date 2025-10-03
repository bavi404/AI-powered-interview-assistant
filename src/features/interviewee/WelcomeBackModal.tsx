import {} from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setWelcomeBack } from '@/store/slices/appSlice'
import { resetInterview, resumeInterview, startInterview } from '@/store/slices/interviewsSlice'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function WelcomeBackModal() {
  const dispatch = useAppDispatch()
  const welcomeFor = useAppSelector(s => s.app.ui.welcomeBackFor)
  const candidate = useAppSelector(s => (welcomeFor ? s.candidates.byId[welcomeFor] : undefined))
  const interview = useAppSelector(s => (welcomeFor ? s.interviews[welcomeFor] : undefined))
  const open = Boolean(welcomeFor && interview && interview.stage !== 'completed')

  const step = interview?.stepIndex ?? 0
  const remaining = interview?.timer.remaining ?? 0

  const onResume = () => {
    if (!welcomeFor) return
    dispatch(resumeInterview({ candidateId: welcomeFor }))
    dispatch(setWelcomeBack(undefined))
  }
  const onRestart = () => {
    if (!welcomeFor) return
    dispatch(resetInterview({ candidateId: welcomeFor }))
    dispatch(startInterview({ candidateId: welcomeFor }))
    dispatch(setWelcomeBack(undefined))
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && dispatch(setWelcomeBack(undefined))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome back{candidate?.name ? `, ${candidate.name}` : ''}!</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          You were on Q{step + 1} with {remaining}s left.
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onRestart}>
            Restart interview
          </Button>
          <Button onClick={onResume}>Resume</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
