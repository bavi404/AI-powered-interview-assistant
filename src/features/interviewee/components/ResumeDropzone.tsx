import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { parseResume } from '@/services/resume/parseResume'
import { useAppDispatch } from '@/store/hooks'
import { upsertCandidate } from '@/store/slices/candidatesSlice'
import { startInterview } from '@/store/slices/interviewsSlice'

export function ResumeDropzone() {
  const dispatch = useAppDispatch()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<null | Awaited<ReturnType<typeof parseResume>>>(null)
  const [loading, setLoading] = useState(false)

  const onFile = useCallback(async (file: File) => {
    setError(null)
    setLoading(true)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)')
      if (!/\.(pdf|docx)$/i.test(file.name))
        throw new Error('Only .pdf or .docx files are supported')
      const parsed = await parseResume(file)
      setPreview(parsed)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to parse resume'
      setError(message)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const onConfirm = useCallback(() => {
    if (!preview) return
    const id = crypto.randomUUID()
    dispatch(
      upsertCandidate({
        id,
        name: preview.fields.name || 'Unknown',
        email: preview.fields.email || '',
        phone: preview.fields.phone || '',
        resumeMeta: {
          filename: preview.meta.filename,
          size: preview.meta.size,
          type: preview.meta.mime || '',
        },
        skills: preview.skills,
      })
    )
    dispatch(startInterview({ candidateId: id }))
  }, [dispatch, preview])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Resume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-dashed p-6 text-center">
          <div className="mb-3 text-sm text-muted-foreground">
            Drop a .pdf or .docx file here, or choose one
          </div>
          <Input
            type="file"
            accept=".pdf,.docx"
            onChange={e => e.target.files && onFile(e.target.files[0])}
          />
        </div>
        {loading && <div className="text-sm text-muted-foreground">Parsing…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {preview && (
          <div className="space-y-2">
            <div className="text-sm">
              <div className="font-medium">Detected</div>
              <div>Name: {preview.fields.name || '—'}</div>
              <div>Email: {preview.fields.email || '—'}</div>
              <div>Phone: {preview.fields.phone || '—'}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {preview.skills.map(s => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
            <Button onClick={onConfirm}>Looks good</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
