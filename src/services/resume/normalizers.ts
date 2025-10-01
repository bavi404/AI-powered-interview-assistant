export function normalizePhone(input: string): string {
  const digits = input.replace(/[^0-9]/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length > 0 && digits.startsWith('0')) return digits
  return digits.length ? `+${digits}` : ''
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase()
}

export function guessNameFromHeader(text: string): string | undefined {
  const header = text.split(/\n|\r/).find(line => line.trim().length > 0) || ''
  const cleaned = header
    .replace(/\s{2,}/g, ' ')
    .replace(/[^a-zA-Z\s\-']/g, ' ')
    .trim()
  // Heuristic: 2-4 tokens capitalized
  const tokens = cleaned.split(' ').filter(Boolean)
  const cap = tokens.filter(t => /^[A-Z][a-zA-Z\-']+$/.test(t))
  if (cap.length >= 2 && cap.length <= 4) {
    return cap.join(' ')
  }
  return undefined
}
