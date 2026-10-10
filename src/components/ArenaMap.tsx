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

export function SeatGrid({ section, taken, selected, onToggle }: SeatGridProps) {
  return (
    <div className="seat-grid" role="group" aria-label={`${section.name} seats. Front row is A, closest to the stage.`}>
      {Array.from({ length: section.rows }, (_, r) => {
        const row = String.fromCharCode(65 + r)
        return (
          <div className="seat-row" key={r}>
            <span className="row-label" aria-hidden="true">{row}</span>
            {Array.from({ length: section.seatsPerRow }, (_, s) => {
              const id = makeSeatId(section.id, r, s)
              const isTaken = taken.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  className="seat"
                  disabled={isTaken}
                  aria-pressed={selected.includes(id)}
                  aria-label={`Row ${row}, seat ${s + 1}${isTaken ? ', taken' : ''}`}
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
  )
}
