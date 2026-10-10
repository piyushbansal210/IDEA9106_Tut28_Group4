import { useRef, useState, type KeyboardEvent } from 'react'
import type { Arena, Section } from '../types'
import { makeSeatId, money } from '../seats'

export type BlockState = 'available' | 'nearly' | 'gone'

interface Props {
  arena: Arena
  label: string
  rankedIds?: string[]
  activeId?: string
  stateOf?: (section: Section) => BlockState
  disabledReason?: (section: Section) => string | null
  onSelect?: (section: Section) => void
  pressed?: (section: Section) => boolean
}

// Venue map: named blocks around the stage, with rank badges and sold-out / nearly-gone states.
export default function ArenaMap({ arena, label, rankedIds = [], activeId, stateOf, disabledReason, onSelect, pressed }: Props) {
  return (
    <div className="stack">
      <div className="arena-map" role="group" aria-label={label}>
        <div className="arena-stage" aria-hidden="true">STAGE</div>
        {arena.sections.map((s) => {
          const rank = rankedIds.indexOf(s.id) + 1
          const state = stateOf?.(s) ?? 'available'
          const reason = disabledReason?.(s) ?? (state === 'gone' ? 'Sold out' : null)
          const desc = [s.name, money(s.price), s.kind === 'standing' ? 'standing' : 'seated', rank ? `your choice ${rank}` : '', reason ?? (state === 'nearly' ? 'nearly gone' : '')].filter(Boolean).join(', ')
          return (
            <button
              key={s.id}
              type="button"
              className={`arena-block ${state === 'gone' ? 'gone' : state === 'nearly' ? 'nearly' : ''} ${activeId === s.id ? 'active' : ''}`}
              style={{ gridArea: s.id }}
              data-rank={rank || undefined}
              aria-pressed={pressed ? pressed(s) : undefined}
              aria-label={desc}
              title={reason ?? undefined}
              disabled={!onSelect || !!reason}
              onClick={() => onSelect?.(s)}
            >
              {rank > 0 && <span className="rank-dot" aria-hidden="true">{rank}</span>}
              <span>{s.name}</span>
              <span className="price">{money(s.price)}{s.kind === 'standing' ? ' · standing' : ''}</span>
            </button>
          )
        })}
      </div>
      <div className="legend" aria-hidden="true">
        <span><i /> available</span>
        <span><i className="l-near" /> nearly gone</span>
        <span><i className="l-gone" /> sold out / over budget</span>
        {rankedIds.length > 0 && <span><i className="l-ranked" /> your ranked sections</span>}
      </div>
    </div>
  )
}

interface SeatGridProps {
  section: Section
  taken: Set<string>
  selected: string[]
  onToggle: (id: string) => void
}

type Pos = [row: number, seat: number]

// Seat picker with a roving tab stop: Tab enters the grid once, arrows move between free seats, Space/Enter picks.
export function SeatGrid({ section, taken, selected, onToggle }: SeatGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [focusPos, setFocusPos] = useState<Pos | null>(null)
  const [help, setHelp] = useState(false)
  const { rows, seatsPerRow } = section
  const free = ([r, s]: Pos) => r >= 0 && r < rows && s >= 0 && s < seatsPerRow && !taken.has(makeSeatId(section.id, r, s))

  const firstFree = (): Pos | null => {
    for (let r = 0; r < rows; r++) for (let s = 0; s < seatsPerRow; s++) if (free([r, s])) return [r, s]
    return null
  }
  const selectedPos = selected.map((id) => id.split(':')[1]).filter(Boolean).map((p): Pos => [p.charCodeAt(0) - 65, Number(p.slice(1)) - 1]).find(free)
  const active = focusPos && free(focusPos) ? focusPos : selectedPos ?? firstFree()

  // Nearest free seat in a row, so up/down still lands somewhere when the seat straight ahead is taken.
  const nearestInRow = (r: number, s: number): Pos | null => {
    for (let d = 0; d < seatsPerRow; d++) {
      if (free([r, s - d])) return [r, s - d]
      if (free([r, s + d])) return [r, s + d]
    }
    return null
  }

  const target = (key: string, [r, s]: Pos): Pos | null => {
    switch (key) {
      case 'ArrowLeft':
        for (let x = s - 1; x >= 0; x--) if (free([r, x])) return [r, x]
        return null
      case 'ArrowRight':
        for (let x = s + 1; x < seatsPerRow; x++) if (free([r, x])) return [r, x]
        return null
      case 'ArrowUp':
        for (let y = r - 1; y >= 0; y--) { const p = nearestInRow(y, s); if (p) return p }
        return null
      case 'ArrowDown':
        for (let y = r + 1; y < rows; y++) { const p = nearestInRow(y, s); if (p) return p }
        return null
      case 'Home':
        return nearestInRow(r, 0)
      case 'End':
        return nearestInRow(r, seatsPerRow - 1)
    }
    return null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '?') {
      e.preventDefault()
      return setHelp((h) => !h)
    }
    if (!active || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const next = target(e.key, active)
    if (!next) return
    setFocusPos(next)
    ref.current?.querySelector<HTMLButtonElement>(`[data-seat="${makeSeatId(section.id, next[0], next[1])}"]`)?.focus()
  }

  return (
    <div className="stack-sm">
      <div ref={ref} className="seat-grid" role="group" aria-label={`${section.name} seats. Front row is A, closest to the stage. Use arrow keys to move between seats, Space to pick, question mark for help.`} onKeyDown={onKeyDown}>
        {Array.from({ length: rows }, (_, r) => {
          const row = String.fromCharCode(65 + r)
          return (
            <div className="seat-row" key={r}>
              <span className="row-label" aria-hidden="true">{row}</span>
              {Array.from({ length: seatsPerRow }, (_, s) => {
                const id = makeSeatId(section.id, r, s)
                const isTaken = taken.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className="seat"
                    data-seat={id}
                    tabIndex={active && active[0] === r && active[1] === s ? 0 : -1}
                    disabled={isTaken}
                    aria-pressed={selected.includes(id)}
                    aria-label={`Row ${row}, seat ${s + 1}${isTaken ? ', taken' : ''}`}
                    onFocus={() => setFocusPos([r, s])}
                    onClick={() => onToggle(id)}
                  >
                    {s + 1}
                  </button>
                )
              })}
              <span className="row-label" aria-hidden="true">{row}</span>
            </div>
          )
        })}
      </div>
      <div className="row between">
        <span className="tiny muted">Keyboard: arrows move · Space picks · ? shows all shortcuts</span>
        <button type="button" className="link-btn small" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? 'Hide shortcuts' : 'Keyboard shortcuts'}</button>
      </div>
      {help && (
        <dl className="shortcuts small">
          <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>Next free seat in the row</dd>
          <dt><kbd>↑</kbd> <kbd>↓</kbd></dt><dd>Row closer to / further from the stage</dd>
          <dt><kbd>Home</kbd> <kbd>End</kbd></dt><dd>Start / end of the row</dd>
          <dt><kbd>Space</kbd> <kbd>Enter</kbd></dt><dd>Pick or un-pick the seat</dd>
          <dt><kbd>?</kbd></dt><dd>Show or hide this list</dd>
        </dl>
      )}
    </div>
  )
}
