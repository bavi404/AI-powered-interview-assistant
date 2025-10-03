import { useMemo, useRef, useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { pushChatMessage, startInterview } from '@/store/slices/interviewsSlice'
import { upsertCandidate } from '@/store/slices/candidatesSlice'
import { setLastActiveCandidate } from '@/store/slices/appSlice'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { z } from 'zod'

const emailSchema = z.string().email()
const phoneSchema = z
  .string()
  .regex(/^(\+?\d[\d\s\-()]{7,}\d)$/)
  .or(z.string().regex(/^[0-9\-().\s]{7,}$/))
const nameSchema = z.string().min(2)

function useActiveCandidateId(): string | undefined {
  const selected = useAppSelector(s => s.dashboard.selectedCandidateId)
  const lastActive = useAppSelector(s => s.app.lastActiveCandidateId)
  return selected ?? lastActive
}

export function PreflightChat() {
  const dispatch = useAppDispatch()
  const candidateId = useActiveCandidateId()
  const candidates = useAppSelector(s => s.candidates)
  const interviews = useAppSelector(s => s.interviews)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const profile = candidateId ? candidates.byId[candidateId] : undefined
  const interview = candidateId ? interviews[candidateId] : undefined
  const messages = interview?.messages ?? []

  const missing = useMemo(() => {
    if (!profile) return ['name', 'email', 'phone'] as const
    const list: Array<'name' | 'email' | 'phone'> = []
    if (!profile.name) list.push('name')
    if (!profile.email) list.push('email')
    if (!profile.phone) list.push('phone')
    return list
  }, [profile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing])

  useEffect(() => {
    // greet if no messages
    if (!candidateId || !interview) return
    if (messages.length === 0) {
      const greet =
        missing.length > 0
          ? `Hi! I'll collect a few details before we begin. Let's start with your ${missing[0]}.`
          : `Great, I have your details. Ready to start the interview?`
      dispatch(
        pushChatMessage({
          candidateId,
          message: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: greet,
            timestamp: new Date().toISOString(),
          },
        })
      )
    }
  }, [candidateId, interview, messages.length, missing, dispatch])

  if (!candidateId) return null

  const askNext = (nextMissing: Array<'name' | 'email' | 'phone'>) => {
    if (nextMissing.length === 0) {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        dispatch(
          pushChatMessage({
            candidateId,
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content:
                'Great, we’ll start a timed interview. You’ll get 6 questions (2 easy, 2 medium, 2 hard).',
              timestamp: new Date().toISOString(),
            },
          })
        )
        dispatch(startInterview({ candidateId }))
      }, 800)
      return
    }
    const field = nextMissing[0]
    const promptMap: Record<typeof field, string> = {
      name: 'What is your full name?',
      email: 'What is your email address?',
      phone: 'What is your phone number?',
    }
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      dispatch(
        pushChatMessage({
          candidateId,
          message: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: promptMap[field],
            timestamp: new Date().toISOString(),
          },
        })
      )
    }, 600)
  }

  const handleSend = () => {
    if (!input.trim()) return
    dispatch(
      pushChatMessage({
        candidateId,
        message: {
          id: crypto.randomUUID(),
          role: 'user',
          content: input,
          timestamp: new Date().toISOString(),
        },
      })
    )

    // validate for current first-missing field
    const nextMissing = [...missing]
    const field = nextMissing.shift()
    if (!field) {
      setInput('')
      askNext([])
      return
    }

    const value = input.trim()
    let ok = false
    try {
      if (field === 'name') ok = nameSchema.parse(value).length > 0
      if (field === 'email') ok = !!emailSchema.parse(value)
      if (field === 'phone') ok = !!phoneSchema.parse(value)
    } catch {
      ok = false
    }

    if (ok) {
      const updated = {
        ...profile,
        id: candidateId,
        name: field === 'name' ? value : profile?.name || '',
        email: field === 'email' ? value : profile?.email || '',
        phone: field === 'phone' ? value : profile?.phone || '',
      }
      dispatch(upsertCandidate(updated))
      dispatch(setLastActiveCandidate(candidateId))
      setInput('')
      askNext(nextMissing)
    } else {
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        dispatch(
          pushChatMessage({
            candidateId,
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'That does not look valid. Please try again.',
              timestamp: new Date().toISOString(),
            },
          })
        )
      }, 600)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pre-Interview Check</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="max-h-64 overflow-auto rounded-md border p-3">
            <ul className="space-y-2">
              {messages.map(m => (
                <li key={m.id} className={m.role === 'assistant' ? 'text-left' : 'text-right'}>
                  <span
                    className={`inline-block max-w-[85%] rounded-md px-3 py-2 text-sm ${
                      m.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {m.content}
                  </span>
                </li>
              ))}
              {typing && (
                <li className="text-left">
                  <span className="inline-block rounded-md bg-muted px-3 py-2 text-sm">
                    typing…
                  </span>
                </li>
              )}
              <div ref={bottomRef} />
            </ul>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Type your reply…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
