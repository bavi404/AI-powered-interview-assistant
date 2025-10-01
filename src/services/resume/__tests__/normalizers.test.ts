import { describe, it, expect } from 'vitest'
import { normalizePhone, normalizeEmail, guessNameFromHeader } from '@/services/resume/normalizers'

describe('normalizers', () => {
  it('normalizePhone', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567')
    expect(normalizePhone('555-123-4567')).toBe('+15551234567')
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567')
  })

  it('normalizeEmail', () => {
    expect(normalizeEmail('  Foo.Bar@Example.COM  ')).toBe('foo.bar@example.com')
  })

  it('guessNameFromHeader', () => {
    const text = 'Jane Doe\nSoftware Engineer\n...'
    expect(guessNameFromHeader(text)).toBe('Jane Doe')
  })
})
