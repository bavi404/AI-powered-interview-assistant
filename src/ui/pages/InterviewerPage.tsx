import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function InterviewerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interviewer</h1>
        <p className="text-muted-foreground">Assess and generate interview prompts.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Prompt Generator</CardTitle>
          <CardDescription>Generate a set of questions for a position.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Input placeholder="e.g. Senior Full-Stack - Node/React" />
          <Button className="justify-self-start md:justify-self-end">Generate</Button>
        </CardContent>
      </Card>
    </div>
  )
}
