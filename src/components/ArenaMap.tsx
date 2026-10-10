import { useMemo } from 'react'
import type { Arena } from '../types'
import { makeSeatId, money, SECTION_COLORS } from '../seats'

interface Props {
  arena: Arena
  taken: Set<string>
  selected: string[]
  onToggle: (seatId: string) => void
  // When false, free seats can't be picked (e.g. the show's ticket limit is reached).
  canSelectMore: boolean
}

// Layout constants (SVG units). Rows curve around the stage, each section further back.
const FIRST_ROW_RADIUS = 100
const ROW_GAP = 17
const SECTION_GAP = 26
const SEAT_GAP = 18
const SEAT_RADIUS = 6.2

interface Seat {
  id: string
  x: number
  y: number
  label: string
  color: string
}

function layout(arena: Arena) {
  const seats: Seat[] = []
  const bands: { path: string; color: string; name: string; labelY: number }[] = []
  let radius = FIRST_ROW_RADIUS

  arena.sections.forEach((section, i) => {
    const color = SECTION_COLORS[i % SECTION_COLORS.length]
    const inner = radius
    let widest = 0
    for (let r = 0; r < section.rows; r++) {
      const step = SEAT_GAP / radius
      const half = ((section.seatsPerRow - 1) * step) / 2
      widest = Math.max(widest, half)
      for (let s = 0; s < section.seatsPerRow; s++) {
        const angle = -half + s * step
        seats.push({
          id: makeSeatId(section.id, r, s),
          x: radius * Math.sin(angle),
          y: radius * Math.cos(angle),
          label: `${section.name} · Row ${String.fromCharCode(65 + r)} · Seat ${s + 1} · ${money(section.price)}`,
          color,
        })
      }
      radius += ROW_GAP
    }
    const outer = radius - ROW_GAP
    bands.push({ path: annulus(inner - 11, outer + 11, widest + 0.06), color, name: section.name, labelY: outer + 11 })
    radius += SECTION_GAP - ROW_GAP
  })

  const pad = 20
  const xs = seats.map((s) => s.x)
  const ys = seats.map((s) => s.y)
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const maxY = Math.max(...ys) + pad
  const minY = -60 // room for the stage
  return { seats, bands, viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` }
}

// Ring segment centred on the stage, opening downwards, between two radii and ±halfAngle.
function annulus(r1: number, r2: number, half: number) {
  const pt = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(1)} ${(r * Math.cos(a)).toFixed(1)}`
  const large = half * 2 > Math.PI ? 1 : 0
  return [
    `M ${pt(r1, -half)}`,
    `A ${r1} ${r1} 0 ${large} 0 ${pt(r1, half)}`,
    `L ${pt(r2, half)}`,
    `A ${r2} ${r2} 0 ${large} 1 ${pt(r2, -half)}`,
    'Z',
  ].join(' ')
}

export default function ArenaMap({ arena, taken, selected, onToggle, canSelectMore }: Props) {
  const { seats, bands, viewBox } = useMemo(() => layout(arena), [arena])

  return (
    <div className="arena-map">
      <svg viewBox={viewBox} role="group" aria-label={`Seat map for ${arena.name}`}>
        <defs>
          <radialGradient id="stage-glow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#ff3d8b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff3d8b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="stage-fill" x1="0" x2="1">
            <stop offset="0%" stopColor="#ff3d8b" />
            <stop offset="100%" stopColor="#8b6cff" />
          </linearGradient>
        </defs>

        <ellipse cx="0" cy="0" rx="260" ry="200" fill="url(#stage-glow)" />
        {bands.map((b) => (
          <path key={b.name} d={b.path} fill={b.color} fillOpacity="0.07" stroke={b.color} strokeOpacity="0.25" />
        ))}

        <path d="M -90 -44 L 90 -44 L 70 40 Q 0 62 -70 40 Z" fill="url(#stage-fill)" />
        <text x="0" y="6" className="stage-label" textAnchor="middle">STAGE</text>

        {seats.map((seat) => {
          const isTaken = taken.has(seat.id)
          const isSelected = selected.includes(seat.id)
          const disabled = isTaken || (!isSelected && !canSelectMore)
          const toggle = () => !disabled && onToggle(seat.id)
          return (
            <circle
              key={seat.id}
              cx={seat.x}
              cy={seat.y}
              r={SEAT_RADIUS}
              className={`seat-dot${isTaken ? ' taken' : ''}${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
              style={{ ['--seat' as string]: seat.color }}
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={disabled}
              aria-label={`${seat.label}${isTaken ? ' (taken)' : ''}`}
              tabIndex={isTaken ? -1 : 0}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle()
                }
              }}
            >
              <title>{isTaken ? `${seat.label} (taken)` : seat.label}</title>
            </circle>
          )
        })}
      </svg>
    </div>
  )
}
