import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import { fromBuffer as detectFileTypeFromBuffer } from 'file-type'
import { normalizeEmail, normalizePhone, guessNameFromHeader } from '@/services/resume/normalizers'

const DEFAULT_SKILLS = [
  'react',
  'typescript',
  'javascript',
  'node',
  'express',
  'graphql',
  'redux',
  'tailwind',
  'css',
  'html',
  'python',
  'java',
  'docker',
  'kubernetes',
  'aws',
]

type ParsedResume = {
  text: string
  meta: { filename: string; size: number; mime?: string }
  fields: { name?: string; email?: string; phone?: string }
  skills: string[]
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer()
}

interface PdfTextContentItem {
  str?: string
}
interface PdfPage {
  getTextContent: () => Promise<{ items: Array<PdfTextContentItem> }>
}
interface PdfDoc {
  numPages: number
  getPage: (n: number) => Promise<PdfPage>
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Access pdfjs getDocument with minimal typing
  const getDocument = (
    pdfjsLib as unknown as {
      getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<PdfDoc> }
    }
  ).getDocument
  const doc = await getDocument({ data: buffer }).promise
  let text = ''
  const num = doc.numPages
  for (let i = 1; i <= num; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const items = content.items.map(i => (typeof i.str === 'string' ? i.str : ''))
    text += items.join(' ') + '\n'
  }
  return text
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer })
  return value
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? normalizeEmail(match[0]) : undefined
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(?:\+?\d[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/)
  return match ? normalizePhone(match[0]) : undefined
}

function extractSkills(text: string, dictionary: string[] = DEFAULT_SKILLS): string[] {
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const skill of dictionary) {
    const re = new RegExp(`(?:^|[^a-z])${skill}(?:$|[^a-z])`, 'i')
    if (re.test(lower)) found.add(skill)
  }
  // Simple bigram matching for two-word skills
  const tokens = lower.split(/[^a-z0-9+#.]+/).filter(Boolean)
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`
    if (dictionary.includes(bigram)) found.add(bigram)
  }
  return Array.from(found).sort()
}

export async function parseResume(file: File): Promise<ParsedResume> {
  const buffer = await readFileAsArrayBuffer(file)
  const kind = await detectFileTypeFromBuffer(Buffer.from(buffer))
  let text = ''
  let mime = kind?.mime || file.type

  if ((mime && mime.includes('pdf')) || file.name.toLowerCase().endsWith('.pdf')) {
    text = await extractPdfText(buffer)
  } else if (
    (mime && mime.includes('wordprocessingml')) ||
    file.name.toLowerCase().endsWith('.docx')
  ) {
    text = await extractDocxText(buffer)
  } else {
    // Try both as fallback
    try {
      text = await extractPdfText(buffer)
      mime = 'application/pdf'
    } catch {
      text = await extractDocxText(buffer)
      mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  }

  const fields = {
    name: guessNameFromHeader(text),
    email: extractEmail(text),
    phone: extractPhone(text),
  }
  const skills = extractSkills(text)

  return {
    text,
    meta: { filename: file.name, size: file.size, mime },
    fields,
    skills,
  }
}

export type { ParsedResume }
