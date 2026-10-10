import { randomBytes, randomInt } from 'node:crypto'

// Self-hosted CAPTCHA: the answer never leaves the server, each challenge is single-use and expires.

export type CaptchaMode = 'image' | 'text'

export interface Challenge {
  answer: string
  // An SVG for the image mode, or a plain-language question for the accessible text mode.
  svg?: string
  question?: string
}

// No 0/O, 1/I/L: characters people confuse.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function imageChallenge(length = 5): Challenge {
  const answer = Array.from({ length }, () => CHARS[randomInt(CHARS.length)]).join('')
  const w = 180
  const h = 60
  const noise = Array.from({ length: 6 }, () => {
    const [x1, y1, x2, y2] = [randomInt(w), randomInt(h), randomInt(w), randomInt(h)]
    return `<path d="M${x1} ${y1} Q${randomInt(w)} ${randomInt(h)} ${x2} ${y2}" stroke="#${randomInt(0x555555).toString(16).padStart(6, '0')}" stroke-width="${1 + randomInt(2)}" fill="none" opacity="0.6"/>`
  })
  const dots = Array.from({ length: 30 }, () => `<circle cx="${randomInt(w)}" cy="${randomInt(h)}" r="1" fill="#666"/>`)
  const glyphs = [...answer].map((c, i) => {
    const x = 18 + i * 32 + randomInt(-4, 5)
    const y = 40 + randomInt(-6, 7)
    return `<text x="${x}" y="${y}" font-size="${28 + randomInt(8)}" font-family="monospace" font-weight="700" fill="#111" transform="rotate(${randomInt(-25, 26)} ${x} ${y})">${c}</text>`
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f4f1ea"/>${dots.join('')}${glyphs.join('')}${noise.join('')}</svg>`
  return { answer, svg }
}

// Accessible alternative for people who can't read the image (WCAG 1.1.1).
export function textChallenge(): Challenge {
  const a = randomInt(1, 10)
  const b = randomInt(1, 10)
  return randomInt(2)
    ? { answer: String(a + b), question: `What is ${WORDS[a]} plus ${WORDS[b]}?` }
    : { answer: String(Math.max(a, b) - Math.min(a, b)), question: `What is ${WORDS[Math.max(a, b)]} minus ${WORDS[Math.min(a, b)]}?` }
}

export type VerifyResult = 'ok' | 'wrong' | 'expired'

interface Entry {
  answer: string
  expires: number
  attempts: number
}

// In-memory store. It's capped so a flood of "new challenge" requests can't grow memory without limit.
export class CaptchaStore {
  private entries = new Map<string, Entry>()
  private ttlMs: number
  private max: number
  private maxAttempts: number
  private now: () => number

  constructor(ttlMs = 2 * 60_000, max = 5_000, maxAttempts = 3, now = () => Date.now()) {
    this.ttlMs = ttlMs
    this.max = max
    this.maxAttempts = maxAttempts
    this.now = now
  }

  get size() {
    return this.entries.size
  }

  create(answer: string) {
    const t = this.now()
    for (const [id, e] of this.entries) if (e.expires <= t) this.entries.delete(id)
    // Maps keep insertion order, so the first key is the oldest challenge.
    while (this.entries.size >= this.max) this.entries.delete(this.entries.keys().next().value!)
    const id = randomBytes(16).toString('hex')
    this.entries.set(id, { answer, expires: t + this.ttlMs, attempts: 0 })
    return id
  }

  verify(id: string, given: string): VerifyResult {
    const e = this.entries.get(id)
    if (!e || e.expires <= this.now()) {
      this.entries.delete(id)
      return 'expired'
    }
    if (given.trim().toUpperCase() === e.answer) {
      this.entries.delete(id)
      return 'ok'
    }
    if (++e.attempts >= this.maxAttempts) this.entries.delete(id)
    return 'wrong'
  }
}
