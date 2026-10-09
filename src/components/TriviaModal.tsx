import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { navigate } from '../router'
import { showPath } from '../sale'
import { findQuestion } from '../trivia'
import { PRESALE_WINDOW_DAYS, QUESTION_SECONDS, msLeft } from '../streak'
import type { StreakDay } from '../types'
import Modal from './Modal'
import Icon from './Icon'

const LOW_SECONDS = 6
const RING = 2 * Math.PI * 28
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

function TimerRing({ left }: { left: number }) {
  const secs = Math.ceil(left / 1000)
  // With reduced motion the ring stays full; the number still counts down.
  const fraction = reducedMotion() ? 1 : left / (QUESTION_SECONDS * 1000)
  return (
    <div className={`ring ${secs < LOW_SECONDS ? 'low' : ''}`} role="timer" aria-label={`${secs} seconds left`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="ring-track" cx="32" cy="32" r="28" fill="none" strokeWidth="5" />
        <circle className="ring-bar" cx="32" cy="32" r="28" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING * (1 - fraction)} />
      </svg>
      <b aria-hidden="true">{secs}</b>
    </div>
  )
}

function Result({ day, showId, length }: { day: StreakDay; showId: string; length: number }) {
  const presale = usePresale()
  const store = useStore()
  const q = findQuestion(day.questionId)
  const correct = day.result === 'correct'
  const title = correct ? 'Correct' : day.result === 'timeout' ? 'Time\'s up' : 'Not this time'
  const show = store.findShow(showId)
  return (
    <div className="stack" style={{ marginTop: 8, alignItems: 'flex-start' }}>
      <div className="row" style={{ gap: 16 }}>
        <div className={`result-burst r-${day.result}`} aria-hidden="true">
          {correct ? <Icon name="check" /> : day.result === 'timeout' ? <Icon name="clock" /> : <span className="streak-dot" />}
        </div>
        <div className="stack-sm" role="status">
          <h3 style={{ fontSize: 26 }}>{title}</h3>
          <p>{correct ? `Green streak: day ${length}.` : `Orange counts. You showed up. Streak: day ${length}.`}</p>
        </div>
      </div>
      {q && (
        <>
          <div className="trivia-opt is-right" style={{ width: '100%' }}>
            <span className="visually-hidden">Correct answer: </span>{q.options[q.answerIndex]}
            <span className="mark" aria-hidden="true"><Icon name="check" size={18} /></span>
          </div>
          <p>{q.explanation}</p>
          <p className="tiny muted">Source: {q.source}</p>
        </>
      )}
      <button
        className="btn btn-primary"
        data-autofocus
        onClick={() => {
          presale.closeTrivia()
          if (show) navigate(showPath(show, 'hub'))
        }}
      >
        See my streak
      </button>
    </div>
  )
}

// Today's question. The 20-second clock starts when the question is first shown and is persisted,
// so closing this, refreshing or switching tabs never resets it.
export default function TriviaModal() {
  const presale = usePresale()
  const store = useStore()
  const showId = presale.triviaFor
  const [, setTick] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  const started = useRef<string | null>(null)
  const autoDone = useRef(false)

  const show = store.findShow(showId ?? undefined)
  const view = showId ? presale.streakFor(showId) : null
  const pending = view?.pending && view.pending.dayIndex === view.dayIndex ? view.pending : undefined
  const question = pending ? findQuestion(pending.questionId) : undefined
  const left = pending ? msLeft(pending, Date.now()) : 0

  // Serve the question once per opening.
  useEffect(() => {
    if (!showId) {
      started.current = null
      autoDone.current = false
      setChosen(null)
      return
    }
    if (started.current === showId) return
    started.current = showId
    presale.startQuestion(showId)
  }, [showId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth ring: re-render every 100 ms while a question is running.
  useEffect(() => {
    if (!pending || chosen !== null) return
    const t = setInterval(() => setTick((n) => n + 1), 100)
    return () => clearInterval(t)
  }, [pending, chosen])

  const secs = Math.ceil(left / 1000)
  useEffect(() => {
    if (secs === 10 || secs === 5) setAnnounce(`${secs} seconds left`)
  }, [secs])

  const answer = (displayIndex: number | null) => {
    if (!showId || !pending || chosen !== null) return
    if (displayIndex === null) {
      presale.submitAnswer(showId, null)
      return
    }
    setChosen(displayIndex)
    const at = Date.now()
    // Briefly reveal right/wrong on the options, then show the result.
    setTimeout(() => {
      presale.submitAnswer(showId, displayIndex, at)
      setChosen(null)
    }, reducedMotion() ? 0 : 700)
  }

  // Time's up.
  useEffect(() => {
    if (pending && chosen === null && left <= 0) answer(null)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // Keys 1-4 answer.
  useEffect(() => {
    if (!pending || chosen !== null) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4 && !(e.target instanceof HTMLInputElement)) answer(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // Demo controls drive the real UI.
  useEffect(() => {
    if (!presale.triviaAuto || !pending || !question || autoDone.current || !showId) return
    autoDone.current = true
    const right = pending.order.indexOf(question.answerIndex)
    if (presale.triviaAuto === 'timeout') presale.fastForward(showId, Math.max(0, left - 3000))
    else setTimeout(() => answer(presale.triviaAuto === 'correct' ? right : (right + 1) % 4), 900)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  if (!showId || !show || !view) return null
  const artist = store.artistOf(store.tourOf(show))
  const close = presale.closeTrivia

  // Nothing to answer today.
  if (!view.dayIndex) {
    return (
      <Modal title={`${artist.name} trivia`} onClose={close}>
        <p style={{ marginTop: 8 }}>
          {view.daysUntil > PRESALE_WINDOW_DAYS ? `Daily questions start ${PRESALE_WINDOW_DAYS} days before the sale.` : 'It\'s sale day, so there\'s no question today. Good luck!'}
        </p>
      </Modal>
    )
  }

  if (view.today) {
    return (
      <Modal title={`${artist.name} trivia · day ${view.dayIndex}`} onClose={close} sheet>
        <Result day={view.today} showId={showId} length={view.length} />
      </Modal>
    )
  }

  if (!pending || !question) return null
  const right = pending.order.indexOf(question.answerIndex)

  return (
    <Modal title={`${artist.name} trivia`} hideTitle onClose={close} wide sheet>
      <div className="trivia">
        <div className="stack">
          <div className="row" style={{ gap: 8 }}>
            <span className="badge badge-live">{artist.name} trivia</span>
            <span className="small muted">Question {view.dayIndex} of {PRESALE_WINDOW_DAYS}</span>
          </div>
          <h3 style={{ fontSize: 22, lineHeight: 1.3 }} id="trivia-q">{question.question}</h3>
          <div className="trivia-opts" role="group" aria-labelledby="trivia-q">
            {pending.order.map((optIndex, i) => {
              const revealed = chosen !== null
              const cls = revealed ? (i === right ? 'is-right' : i === chosen ? 'is-wrong' : '') : ''
              return (
                <button key={optIndex} className={`trivia-opt ${cls}`} disabled={revealed} onClick={() => answer(i)}>
                  <kbd aria-hidden="true">{i + 1}</kbd>
                  {question.options[optIndex]}
                  {revealed && i === right && <span className="mark" aria-hidden="true"><Icon name="check" size={18} /></span>}
                </button>
              )
            })}
          </div>
          <p className="tiny muted">
            <span className="hide-mobile">Press 1–4 to answer. </span>Leaving this screen uses up your time. Your streak never changes your place in the queue.
          </p>
        </div>
        <TimerRing left={left} />
      </div>
      <span className="visually-hidden" aria-live="polite">{announce}</span>
    </Modal>
  )
}
