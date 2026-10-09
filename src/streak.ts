// Presale streak rules. Pure functions, no React and no DOM, so they run in Node tests.
// The streak is engagement only: nothing here is ever read by the queue (src/queue/simulator.ts).
import type { DayState, PendingQuestion, StreakDay, StreakRecord, StreakResult, TriviaQuestion } from './types'
// Explicit .ts extension so this module also runs under `node --test` without a bundler.
import { seeded } from './seats.ts'

export const PRESALE_WINDOW_DAYS = 30
export const QUESTION_SECONDS = 20
// A timed-out question still shows the fan turned up, so it counts as orange ("tried"). Flip to treat it as a miss.
export const TIMEOUT_COUNTS_AS_ATTEMPT = true
// One skip per 7-day block that bridges a missed day. Off for now.
export const ENABLE_SKIP_TOKEN = false
export const NUDGE_HOUR = 9

const QUESTION_MS = QUESTION_SECONDS * 1000

function startOfDay(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Whole calendar days from `now` until the sale, in the viewer's time zone (0 = sale day).
export function daysUntilSale(saleOpensAt: string, now: number) {
  return Math.round((startOfDay(Date.parse(saleOpensAt)) - startOfDay(now)) / 86_400_000)
}

// Day 1 is 30 days before the sale, day 30 is the day before it. Sale day has no question.
export function dayIndexFor(daysUntil: number): number | null {
  return daysUntil >= 1 && daysUntil <= PRESALE_WINDOW_DAYS ? PRESALE_WINDOW_DAYS - daysUntil + 1 : null
}

// Demo clock: 10:00 am `daysUntil` days before the sale, or 45 minutes before it on sale day.
export function simulatedNow(saleOpensAt: string, daysUntil: number) {
  const sale = Date.parse(saleOpensAt)
  if (daysUntil <= 0) return sale - 45 * 60_000
  const d = new Date(startOfDay(sale))
  d.setDate(d.getDate() - daysUntil)
  d.setHours(10)
  return d.getTime()
}

function shuffle<T>(items: T[], seed: string) {
  const rand = seeded(seed)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Same fan + show always gets the same sequence; no question repeats within the window
// (as long as the bank has at least PRESALE_WINDOW_DAYS questions). Options are shuffled per fan.
export function pickQuestion(userId: string, showId: string, dayIndex: number, bank: TriviaQuestion[]) {
  if (!bank.length) throw new Error('Trivia bank is empty')
  const sequence = shuffle(bank.map((_, i) => i), `${userId}:${showId}:sequence`)
  const question = bank[sequence[(dayIndex - 1) % bank.length]]
  const order = shuffle(question.options.map((_, i) => i), `${userId}:${question.id}:options`)
  return { question, order }
}

// `chosen` is the index of the option as displayed (after shuffling), or null if time ran out.
export function scoreAnswer(question: TriviaQuestion, order: number[], chosen: number | null, msTaken: number): StreakResult {
  if (chosen === null || msTaken > QUESTION_MS) return 'timeout'
  return order[chosen] === question.answerIndex ? 'correct' : 'wrong'
}

export const msLeft = (pending: PendingQuestion, now: number) => Math.max(0, QUESTION_MS - (now - pending.shownAt))

// A question that was shown and left unanswered past its 20 seconds becomes a timeout.
// Served questions are always consumed: leaving the page or closing the tab doesn't give a second try.
export function settlePending(record: StreakRecord, now: number): StreakRecord {
  const p = record.pending
  if (!p || msLeft(p, now) > 0) return record
  const day: StreakDay = { dayIndex: p.dayIndex, result: 'timeout', questionId: p.questionId, answeredAt: new Date(p.shownAt + QUESTION_MS).toISOString(), msTaken: QUESTION_MS }
  return { days: { ...record.days, [p.dayIndex]: record.days[p.dayIndex] ?? day } }
}

const attemptCounts = (r: StreakResult) => r !== 'timeout' || TIMEOUT_COUNTS_AS_ATTEMPT

// State of each of the 30 days (index 0 = day 1). `currentDay` is today's day index, or null outside the window.
export function deriveDayStates(record: StreakRecord, currentDay: number | null, daysUntil: number, startDay = 1): DayState[] {
  // Outside the window: before it, every day is in the future; on or after sale day, every day is past.
  const today = currentDay ?? (daysUntil > PRESALE_WINDOW_DAYS ? 0 : PRESALE_WINDOW_DAYS + 1)
  return Array.from({ length: PRESALE_WINDOW_DAYS }, (_, i) => {
    const day = i + 1
    const entry = record.days[day]
    if (entry) {
      if (entry.result === 'correct') return 'correct'
      return attemptCounts(entry.result) ? 'tried' : 'missed'
    }
    if (day < startDay) return 'before'
    if (day < today) return 'missed'
    if (day === today) return 'today'
    return 'future'
  })
}

// Consecutive days answered (green or orange). An unanswered today doesn't break it yet:
// counting starts from yesterday until today is answered.
export function streakLength(states: DayState[]) {
  const todayIdx = states.indexOf('today')
  let n = 0
  let skipBlock = -1
  for (let d = todayIdx !== -1 ? todayIdx - 1 : states.findLastIndex((s) => s !== 'future'); d >= 0; d--) {
    const s = states[d]
    if (s === 'correct' || s === 'tried') n++
    else if (s === 'missed' && ENABLE_SKIP_TOKEN && skipBlock !== Math.floor(d / 7)) skipBlock = Math.floor(d / 7)
    else break
  }
  return n
}

export function summarise(states: DayState[]) {
  const count = (s: DayState) => states.filter((x) => x === s).length
  return { correct: count('correct'), tried: count('tried'), missed: count('missed'), remaining: count('future') + count('today') }
}
