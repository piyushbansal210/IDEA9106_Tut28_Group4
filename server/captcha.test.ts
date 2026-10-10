import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CaptchaStore, imageChallenge, textChallenge } from './captcha.ts'

test('a correct answer passes once, then the challenge is gone', () => {
  const store = new CaptchaStore()
  const id = store.create('AB23C')
  assert.equal(store.verify(id, ' ab23c '), 'ok')
  assert.equal(store.verify(id, 'AB23C'), 'expired')
})

test('three wrong answers burn the challenge', () => {
  const store = new CaptchaStore()
  const id = store.create('AB23C')
  assert.equal(store.verify(id, 'x'), 'wrong')
  assert.equal(store.verify(id, 'y'), 'wrong')
  assert.equal(store.verify(id, 'z'), 'wrong')
  assert.equal(store.verify(id, 'AB23C'), 'expired')
})

test('challenges expire', () => {
  let now = 0
  const store = new CaptchaStore(1000, 10, 3, () => now)
  const id = store.create('AB23C')
  now = 1000
  assert.equal(store.verify(id, 'AB23C'), 'expired')
})

test('the store is capped and drops the oldest challenge first', () => {
  const store = new CaptchaStore(60_000, 3)
  const first = store.create('A')
  store.create('B')
  store.create('C')
  store.create('D')
  assert.equal(store.size, 3)
  assert.equal(store.verify(first, 'A'), 'expired')
})

test('image challenges hide the answer in an SVG with no script', () => {
  const c = imageChallenge()
  assert.match(c.answer, /^[A-Z2-9]{5}$/)
  assert.ok(c.svg?.startsWith('<svg'))
  assert.ok(!c.svg?.includes('<script'))
})

test('text challenges are answerable plain-language sums', () => {
  for (let i = 0; i < 50; i++) {
    const c = textChallenge()
    assert.match(c.question!, /^What is \w+ (plus|minus) \w+\?$/)
    assert.ok(Number(c.answer) >= 0)
  }
})
