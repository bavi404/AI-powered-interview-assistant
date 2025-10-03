import { useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import html2pdf from 'html2pdf.js'
import { deleteCandidate } from '@/store/slices/candidatesSlice'
import { removeInterview } from '@/store/slices/interviewsSlice'

type Html2PdfOptions = {
  margin?: number | number[]
  filename?: string
  image?: { type?: string; quality?: number }
  html2canvas?: { scale?: number }
  jsPDF?: { unit?: string; format?: string | string[]; orientation?: string }
  pagebreak?: { mode?: Array<string> }
}

export function CandidateDetail() {
  const { candidateId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const candidate = useAppSelector(s => (candidateId ? s.candidates.byId[candidateId] : undefined))
  const interview = useAppSelector(s => (candidateId ? s.interviews[candidateId] : undefined))
  const printRef = useRef<HTMLDivElement | null>(null)

  const exportPdf = async () => {
    if (!printRef.current || !candidate) return
    const opt: Html2PdfOptions = {
      margin: [10, 10],
      filename: `${candidate.name.replace(/\s+/g, '_')}_Interview.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }
    await html2pdf().set(opt).from(printRef.current).save()
  }

  const exportJson = () => {
    if (!candidate) return
    const blob = new Blob([JSON.stringify({ candidate, interview }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${candidate.name.replace(/\s+/g, '_')}_Interview.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onDelete = () => {
    if (!confirm('Delete this candidate and interview? This cannot be undone.')) return
    dispatch(deleteCandidate(candidateId))
    dispatch(removeInterview({ candidateId }))
    navigate('/interviewer')
  }

  const summary = interview?.summary
  const qa = interview ? interview.questions.map((q, i) => ({ q, a: interview.answers[i] })) : []

  if (!candidateId || !candidate) {
    return <div className="text-sm text-muted-foreground">No candidate selected.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{candidate.name}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportJson}>
            Export JSON
          </Button>
          <Button onClick={exportPdf}>Export PDF</Button>
          <Button variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2" ref={printRef}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Email:</span> {candidate.email || '—'}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {candidate.phone || '—'}
            </div>
            <div>
              <span className="font-medium">Skills:</span>{' '}
              {(candidate.skills || []).join(', ') || '—'}
            </div>
            {candidate.resumeMeta && (
              <div className="text-muted-foreground">
                {candidate.resumeMeta.filename} ({candidate.resumeMeta.size} bytes,{' '}
                {candidate.resumeMeta.type})
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Score:</span> <span>{summary?.score ?? '—'}</span>
            </div>
            <div>
              <span className="font-medium">Level:</span> {summary?.level ?? '—'}
            </div>
            <div>
              <span className="font-medium">Strengths:</span>{' '}
              {(summary?.strengths || []).join(', ') || '—'}
            </div>
            <div>
              <span className="font-medium">Improvements:</span>{' '}
              {(summary?.improvements || []).join(', ') || '—'}
            </div>
            <div className="flex flex-wrap gap-1">
              {(summary?.badges || []).map(b => (
                <Badge key={b} variant="secondary">
                  {b}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Q & A</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {qa.map(({ q, a }, idx) => (
                <AccordionItem key={q.id} value={q.id}>
                  <AccordionTrigger>
                    <div className="flex w-full items-center justify-between">
                      <span className="text-left">
                        Q{idx + 1}. {q.text}
                      </span>
                      <Badge>{q.difficulty}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Time:</span> {q.seconds}s
                      </div>
                      <div>
                        <span className="font-medium">Answer:</span> {a?.text || '—'}
                      </div>
                      <div>
                        <span className="font-medium">Score:</span> {a?.score ?? '—'}
                      </div>
                      <div>
                        <span className="font-medium">Feedback:</span> {a?.feedback || '—'}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Chat Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-auto rounded-md border p-3 text-sm">
              <ul className="space-y-1">
                {(interview?.messages || []).map(m => (
                  <li key={m.id} className={m.role === 'assistant' ? 'text-left' : 'text-right'}>
                    <span
                      className={`inline-block rounded-md px-2 py-1 ${m.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}
                    >
                      {m.content}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
