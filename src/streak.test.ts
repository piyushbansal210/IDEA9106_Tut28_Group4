// Run with `npm test` (Node's built-in test runner, no extra dependencies).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESALE_WINDOW_DAYS, QUESTION_SECONDS, TIMEOUT_COUNTS_AS_ATTEMPT,
  dayIndexFor, daysUntilSale, deriveDayStates, pickQuestion, scoreAnswer, settlePending, simulatedNow, streakLength,
} from './streak.ts'
import { triviaBank } from './trivia.ts'
import { STREAK_COLOURS, contrast, saturation, themes, themeTokens } from './color.ts'
import type { StreakDay, StreakRecord, StreakResult } from './types.ts'

const bank = triviaBank.bts
const day = (dayIndex: number, result: StreakResult): StreakDay => ({ dayIndex, result, questionId: 'q', answeredAt: '2027-01-01T00:00:00Z', msTaken: 5000 })
const record = (results: Record<number, StreakResult>): StreakRecord => ({ days: Object.fromEntries(Object.entries(results).map(([d, r]) => [d, day(Number(d), r)])) })

test('correct answer scores green', () => {
  const { question, order } = pickQuestion('fan', 'show', 1, bank)
  const shownIndex = order.indexOf(question.answerIndex)
  assert.equal(scoreAnswer(question, order, shownIndex, 4000), 'correct')
})

test('wrong answer scores orange (tried)', () => {
  const { question, order } = pickQuestion('fan', 'show', 1, bank)
  const wrong = order.findIndex((o) => o !== question.answerIndex)
  assert.equal(scoreAnswer(question, order, wrong, 4000), 'wrong')
  const states = deriveDayStates(record({ 1: 'wrong' }), 2, PRESALE_WINDOW_DAYS - 1)
  assert.equal(states[0], 'tried')
})

test('timeout: no answer, or answering after 20 seconds', () => {
  const { question, order } = pickQuestion('fan', 'show', 1, bank)
  assert.equal(scoreAnswer(question, order, null, 1000), 'timeout')
  assert.equal(scoreAnswer(question, order, order.indexOf(question.answerIndex), QUESTION_SECONDS * 1000 + 1), 'timeout')
  const states = deriveDayStates(record({ 1: 'timeout' }), 2, PRESALE_WINDOW_DAYS - 1)
  assert.equal(states[0], TIMEOUT_COUNTS_AS_ATTEMPT ? 'tried' : 'missed')
})

test('an unanswered served question becomes a timeout once its 20 seconds are up', () => {
  const pending = { dayIndex: 3, questionId: 'q', shownAt: 1_000, order: [0, 1, 2, 3] }
  assert.deepEqual(settlePending({ days: {}, pending }, 1_000 + 19_000).pending, pending)
  const settled = settlePending({ days: {}, pending }, 1_000 + 20_000)
  assert.equal(settled.pending, undefined)
  assert.equal(settled.days[3].result, 'timeout')
})

test('a missed day resets the streak', () => {
  // Days 1-3 answered, day 4 missed, days 5-6 answered, today is day 7 (unanswered).
  const states = deriveDayStates(record({ 1: 'correct', 2: 'correct', 3: 'wrong', 5: 'correct', 6: 'timeout' }), 7, 24)
  assert.equal(states[3], 'missed')
  assert.equal(states[6], 'today')
  assert.equal(streakLength(states), 2)
})

test('an unanswered today does not break the streak; answering it extends it', () => {
  const before = deriveDayStates(record({ 1: 'correct', 2: 'correct' }), 3, 28)
  assert.equal(streakLength(before), 2)
  const after = deriveDayStates(record({ 1: 'correct', 2: 'correct', 3: 'wrong' }), 3, 28)
  assert.equal(streakLength(after), 3)
})

test('days before registering are not counted as missed', () => {
  const states = deriveDayStates(record({ 10: 'correct' }), 11, 20, 10)
  assert.equal(states[0], 'before')
  assert.equal(states[8], 'before')
  assert.equal(streakLength(states), 1)
})

test('the same question is never served twice in the window', () => {
  for (const [artist, questions] of Object.entries(triviaBank)) {
    assert.ok(questions.length >= PRESALE_WINDOW_DAYS, `${artist} needs at least ${PRESALE_WINDOW_DAYS} questions`)
    const ids = Array.from({ length: PRESALE_WINDOW_DAYS }, (_, i) => pickQuestion('fan', 'show', i + 1, questions).question.id)
    assert.equal(new Set(ids).size, PRESALE_WINDOW_DAYS, `${artist} repeated a question`)
  }
})

test('option shuffle is stable per fan and differs between fans', () => {
  const a1 = pickQuestion('alex', 'show', 5, bank)
  const a2 = pickQuestion('alex', 'show', 5, bank)
  assert.deepEqual(a1.order, a2.order)
  assert.equal(a1.question.id, a2.question.id)
  const sequences = ['alex', 'sam', 'kim', 'jo', 'lee'].map((u) => Array.from({ length: 5 }, (_, i) => pickQuestion(u, 'show', i + 1, bank).question.id).join())
  assert.ok(new Set(sequences).size > 1, 'different fans should get different question orders')
})

test('window edges: day 1 is 30 days out, day 30 is the day before, sale day has no question', () => {
  assert.equal(dayIndexFor(30), 1)
  assert.equal(dayIndexFor(1), 30)
  assert.equal(dayIndexFor(0), null)
  assert.equal(dayIndexFor(31), null)
  const sale = '2027-03-14T19:30:00+11:00'
  assert.equal(daysUntilSale(sale, simulatedNow(sale, 30)), 30)
  assert.equal(daysUntilSale(sale, simulatedNow(sale, 1)), 1)
  assert.equal(daysUntilSale(sale, simulatedNow(sale, 0)), 0)
  // On sale day every window day is in the past.
  const saleDay = deriveDayStates(record({ 30: 'correct' }), null, 0)
  assert.equal(saleDay[29], 'correct')
  assert.equal(saleDay[0], 'missed')
  assert.ok(!saleDay.includes('today') && !saleDay.includes('future'))
  // Before the window every day is in the future.
  assert.ok(deriveDayStates({ days: {} }, null, 45).every((s) => s === 'future'))
})

test('every trivia question is well formed', () => {
  for (const q of Object.values(triviaBank).flat()) {
    assert.equal(q.options.length, 4, q.id)
    assert.ok(q.answerIndex >= 0 && q.answerIndex < 4, q.id)
    assert.ok(q.explanation && q.source, q.id)
    assert.equal(new Set(q.options).size, 4, `${q.id} has duplicate options`)
  }
})

// Streak colours must be readable in every theme and stay distinct from the Desert Chic brand oranges.
test('streak colours: icon contrast, 3:1 cell edges, distinct from every theme accent', () => {
  for (const [k, c] of Object.entries(STREAK_COLOURS)) {
    assert.ok(contrast(c.fill, c.icon) >= 4.5, `${k} icon contrast ${contrast(c.fill, c.icon).toFixed(2)}`)
    assert.ok(contrast(c.border, '#FFFFFF') >= 3, `${k} cell edge on white ${contrast(c.border, '#FFFFFF').toFixed(2)}`)
  }
  const tried = STREAK_COLOURS.tried.fill
  for (const t of themes) {
    const accent = themeTokens(t.swatch)['--accent']
    const byLightness = contrast(tried, accent) >= 1.3
    const bySaturation = Math.abs(saturation(tried) - saturation(accent)) >= 0.3
    assert.ok(byLightness || bySaturation, `"tried" amber too close to ${t.name} (${accent})`)
  }
})
