import { useEffect, useRef, useState } from 'react'

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatCountdown(ms: number) {
  const { d, h, m, s } = splitDuration(ms)
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`
  return `${pad(m)}:${pad(s)}`
}

function spoken(ms: number) {
  const { d, h, m } = splitDuration(ms)
  const parts = [d && `${d} days`, h && `${h} hours`, `${m} minutes`].filter(Boolean)
  return parts.join(', ')
}

interface Props {
  to: string
  onDone?: () => void
  className?: string
}

// Ticks every second visually; screen readers hear an update at most once a minute.
export default function Countdown({ to, onDone, className }: Props) {
  const target = Date.parse(to)
  const [now, setNow] = useState(Date.now())
  const done = useRef(false)
  const doneCb = useRef(onDone)
  doneCb.current = onDone

  useEffect(() => {
    done.current = false
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])

  const left = target - now
  useEffect(() => {
    if (left <= 0 && !done.current) {
      done.current = true
      doneCb.current?.()
    }
  }, [left])

  const minuteKey = Math.ceil(left / 60_000)
  return (
    <span className={`num ${className ?? ''}`}>
      <span aria-hidden="true">{formatCountdown(left)}</span>
      <span className="visually-hidden" aria-live="polite" key={minuteKey}>
        {left > 0 ? spoken(left) : 'now'}
      </span>
    </span>
  )
}
