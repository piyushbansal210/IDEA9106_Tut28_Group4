import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEmail, type EmailContext } from './emails.ts'
import type { EmailTemplate } from './types.ts'

const ctx: EmailContext = {
  name: 'Sam <script>',
  artist: 'BTS',
  tourName: 'Permission to Dance: Australia',
  city: 'Melbourne',
  arenaName: 'Rod Laver Arena',
  saleTime: 'Sat, 14 Mar 2027, 8:00 pm (7:00 pm AEST venue time)',
  waitingRoomTime: '7:30 pm',
  streak: 12,
  readiness: { loggedIn: true, plan: false, card: false },
  links: { hub: 'https://example.test/#/hub', plan: 'https://example.test/#/plan', card: 'https://example.test/#/hub', waiting: 'https://example.test/#/waiting' },
}
const templates: EmailTemplate[] = ['day-7', 'day-1', 'hour-before']

test('emails never ask for card details or contain a form', () => {
  for (const t of templates) {
    const e = buildEmail(t, ctx)
    assert.doesNotMatch(e.html, /<(form|input|select|textarea)\b/i, t)
    assert.doesNotMatch(e.html + e.text, /card number|cvv|expiry/i, t)
    assert.match(e.html, /We will never ask for card details by email\./, t)
    assert.match(e.text, /We will never ask for card details by email\./, t)
  }
})

test('emails escape fan-supplied text and include the sale time with venue time', () => {
  const e = buildEmail('day-7', ctx)
  assert.doesNotMatch(e.html, /<script>/)
  assert.match(e.html, /Sam &lt;script&gt;/)
  assert.match(e.html, /7:00 pm AEST venue time/)
})

test('day 1 email includes the plan link only when a plan applies, and the no-refresh tip', () => {
  assert.match(buildEmail('day-1', ctx).text, /Set my plan: https:\/\/example\.test\/#\/plan/)
  assert.doesNotMatch(buildEmail('day-1', { ...ctx, readiness: { ...ctx.readiness, plan: null } }).text, /ticket plan/)
  assert.match(buildEmail('day-1', ctx).text, /don't refresh/)
})
