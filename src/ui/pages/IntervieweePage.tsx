import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResumeDropzone } from '@/features/interviewee/components/ResumeDropzone'
import { PreflightChat } from '@/features/interviewee/PreflightChat'
import { InterviewRun } from '@/features/interviewee/InterviewRun'
import { useAppSelector } from '@/store/hooks'

export function IntervieweePage() {
  const activeId = useAppSelector(s => s.app.lastActiveCandidateId)
  const interview = useAppSelector(s => (activeId ? s.interviews[activeId] : undefined))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interviewee</h1>
        <p className="text-muted-foreground">Prepare and practice answers with guidance.</p>
      </div>
      <ResumeDropzone />
      <PreflightChat />
      {activeId && interview?.stage === 'running' && <InterviewRun candidateId={activeId} />}
      <Card>
        <CardHeader>
          <CardTitle>Practice Session</CardTitle>
          <CardDescription>Start a practice session with a role and topic.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Input placeholder="e.g. Frontend Engineer - React" />
          <Button className="justify-self-start md:justify-self-end">Start</Button>
        </CardContent>
      </Card>
    </div>
  )
}
