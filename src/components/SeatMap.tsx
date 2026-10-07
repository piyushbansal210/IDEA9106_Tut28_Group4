import type { Arena } from '../types'
import { makeSeatId } from '../seats'

interface Props {
  arena: Arena
  taken: Set<string>
  selected: string[]
  onToggle: (seatId: string) => void
}

export default function SeatMap({ arena, taken, selected, onToggle }: Props) {
  return (
    <div className="seatmap">
      <div className="stage">STAGE</div>
      {arena.sections.map((section) => (
        <div key={section.id} className="section">
          <h4>
            {section.name} · ${section.price}
          </h4>
          <div className="rows">
            {Array.from({ length: section.rows }, (_, r) => (
              <div key={r} className="seat-row">
                <span className="row-label">{String.fromCharCode(65 + r)}</span>
                {Array.from({ length: section.seatsPerRow }, (_, s) => {
                  const id = makeSeatId(section.id, r, s)
                  const isTaken = taken.has(id)
                  const isSelected = selected.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      title={id}
                      className={`seat ${isTaken ? 'taken' : ''} ${isSelected ? 'selected' : ''}`}
                      disabled={isTaken}
                      onClick={() => onToggle(id)}
                    >
                      {s + 1}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="legend small">
        <span><i className="seat" /> Available</span>
        <span><i className="seat selected" /> Selected</span>
        <span><i className="seat taken" /> Taken</span>
      </div>
    </div>
  )
}
