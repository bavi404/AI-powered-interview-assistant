export interface LLMProvider {
  complete(system: string, user: string): Promise<string>
}

type BackoffOptions = { retries?: number; initialMs?: number; factor?: number }

async function withBackoff<T>(fn: () => Promise<T>, opts: BackoffOptions = {}): Promise<T> {
  const { retries = 3, initialMs = 500, factor = 2 } = opts
  let attempt = 0
  let delay = initialMs

  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      if (attempt > retries) throw err
      await new Promise(res => setTimeout(res, delay))
      delay *= factor
    }
  }
}

class TokenBucket {
  private tokens: number
  private lastRefill: number
  constructor(
    private capacity: number,
    private refillPerSec: number
  ) {
    this.tokens = capacity
    this.lastRefill = Date.now()
  }
  async removeToken() {
    while (this.tokens < 1) {
      this.refill()
      await new Promise(res => setTimeout(res, 100))
    }
    this.tokens -= 1
  }
  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    const refill = Math.floor(elapsed * this.refillPerSec)
    if (refill > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + refill)
      this.lastRefill = now
    }
  }
}

export class OpenAICompatibleProvider implements LLMProvider {
  private bucket = new TokenBucket(3, 1) // up to 3 req burst, ~1 rps

  async complete(system: string, user: string): Promise<string> {
    const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || import.meta.env.OPENAI_BASE_URL
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY
    if (!baseUrl || !apiKey) throw new Error('LLM provider is not configured')

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }

    const exec = async () => {
      await this.bucket.removeToken()
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        const errTyped = new Error(`LLM error ${res.status}: ${txt}`) as Error & {
          retryable?: boolean
        }
        // Map 429/5xx for retry eligibility
        errTyped.retryable = res.status === 429 || res.status >= 500
        throw errTyped
      }
      const json = await res.json()
      const content = json?.choices?.[0]?.message?.content
      if (typeof content !== 'string') throw new Error('Invalid LLM response')
      return content
    }

    return withBackoff(exec, { retries: 3, initialMs: 800, factor: 2 })
  }
}

export const llm: LLMProvider = new OpenAICompatibleProvider()
