import { describe, it, expect, vi } from 'vitest'
import { parseResume } from '@/services/resume/parseResume'

// Mock pdfjs and mammoth for lightweight tests
vi.mock('pdfjs-dist', () => ({
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({
        getTextContent: async () => ({
          items: [{ str: 'John Doe john@example.com 555-123-4567 React' }],
        }),
      }),
    }),
  }),
}))

vi.mock('mammoth', () => ({
  default: {
    extractRawText: async () => ({ value: 'Jane Doe jane@example.com 555-123-4567 React' }),
  },
}))

vi.mock('file-type', () => ({ fromBuffer: async () => ({ mime: 'application/pdf' }) }))

describe('parseResume', () => {
  it('parses basic fields from PDF-like input', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'resume.pdf', { type: 'application/pdf' })
    const res = await parseResume(file)
    expect(res.fields.email).toBeDefined()
    expect(res.fields.phone).toBeDefined()
    expect(res.skills).toContain('react')
    expect(res.meta.filename).toBe('resume.pdf')
  })
})
