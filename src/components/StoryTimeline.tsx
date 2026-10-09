import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Artist, Milestone } from '../types'
import { seeded } from '../seats'
import { openSpotify, playClip, useMusic } from '../audio'
import Icon from './Icon'

export const kindLabel: Record<Milestone['kind'], string> = {
  'first-release': 'First release',
  breakthrough: 'Breakthrough',
  'biggest-hit': 'Biggest hit',
  milestone: 'Milestone',
  'this-tour': 'This tour',
}

const BARS = 120

// The artist's career drawn as a waveform: each milestone is a peak you can open.
export default function StoryTimeline({ artist, eyebrow = 'While you wait' }: { artist: Artist; eyebrow?: string }) {
  const music = useMusic()
  const [open, setOpen] = useState<number | null>(null)
  const pins = useRef<(HTMLButtonElement | null)[]>([])
  const ms = artist.milestones
  // Spread pins by year but keep same-year milestones apart.
  const positions = useMemo(() => {
    const first = ms[0].year
    const span = Math.max(1, ms[ms.length - 1].year - first)
    return ms.map((m, i) => 0.06 + 0.88 * (0.65 * ((m.year - first) / span) + 0.35 * (i / Math.max(1, ms.length - 1))))
  }, [ms])

  const bars = useMemo(() => {
    const rand = seeded(artist.id)
    return Array.from({ length: BARS }, (_, i) => {
      const x = i / (BARS - 1)
      const near = Math.max(...positions.map((p) => Math.max(0, 1 - Math.abs(p - x) * 22)))
      return { h: 0.15 + rand() * 0.35 + near * 0.5, peak: near > 0.6 }
    })
  }, [artist.id, positions])

  const onKey = (e: KeyboardEvent, i: number) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!move) return
    e.preventDefault()
    pins.current[(i + move + ms.length) % ms.length]?.focus()
  }

  const playing = music.playing && music.artistId === artist.id
  const m = open !== null ? ms[open] : null

  return (
    <section className="card story" aria-labelledby={`story-${artist.id}`}>
      <div className="stack-sm">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={`story-${artist.id}`} style={{ fontSize: 24 }}>The {artist.name} story</h2>
        <p className="muted small">From the first song to this tour. Pick a peak to explore.</p>
      </div>

      <div className="wave-scroll hide-narrow">
        <div className={`wave ${playing ? 'playing' : ''}`}>
          <svg viewBox={`0 0 ${BARS * 6} 120`} preserveAspectRatio="none" aria-hidden="true">
            {bars.map((b, i) => (
              <rect key={i} className={`wave-bar ${b.peak ? 'peak' : ''}`} x={i * 6 + 1} width={3.4} y={60 - b.h * 56} height={b.h * 112} rx={1.7} style={{ animationDelay: `${(i % 12) * 0.08}s` }} />
            ))}
          </svg>
          {ms.map((mm, i) => (
            <button
              key={i}
              ref={(el) => { pins.current[i] = el }}
              className="pin"
              style={{ left: `${positions[i] * 100}%` }}
              aria-expanded={open === i}
              aria-controls={`story-card-${artist.id}`}
              onClick={() => setOpen(open === i ? null : i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <b>{mm.year}</b>
              <span>{mm.title}</span>
            </button>
          ))}
        </div>
      </div>

      <ol className="story-list show-narrow">
        {ms.map((mm, i) => (
          <li key={i}>
            <b>{mm.year} · {mm.title}</b>
            <div className="tiny muted">{kindLabel[mm.kind]}</div>
            <p className="small">{mm.story}</p>
          </li>
        ))}
      </ol>

      {m && (
        <div className="story-card hide-narrow" id={`story-card-${artist.id}`} aria-live="polite">
          <div className="row between">
            <span className="chip">{kindLabel[m.kind]}</span>
            <span className="muted small">{m.year}</span>
          </div>
          <h3 style={{ margin: '10px 0 6px' }}>{m.title}</h3>
          <p>{m.story}</p>
          <div className="row" style={{ marginTop: 12 }}>
            {m.clipUrl ? (
              <button className="btn btn-primary btn-sm" onClick={() => playClip(m.clipUrl!, `${m.title} (snippet)`)}>
                <Icon name="play" size={14} /> Play a snippet
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={openSpotify}>
                <Icon name="music" size={16} /> Listen on Spotify
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// Three-card teaser used on the tour page.
export function StoryPreview({ artist, onExplore }: { artist: Artist; onExplore?: () => void }) {
  return (
    <section className="stack" aria-labelledby="story-preview">
      <div className="row between">
        <h2 id="story-preview" style={{ fontSize: 24 }}>The {artist.name} story</h2>
        {onExplore && <button className="link-btn" onClick={onExplore}>Explore the story →</button>}
      </div>
      <div className="story-strip">
        {artist.milestones.slice(0, 3).map((m) => (
          <article key={m.title} className="card card-tight surface stack-sm">
            <span className="chip" style={{ alignSelf: 'flex-start' }}>{kindLabel[m.kind]} · {m.year}</span>
            <strong>{m.title}</strong>
            <p className="small muted">{m.story}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
