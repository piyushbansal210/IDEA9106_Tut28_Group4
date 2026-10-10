import { useState } from 'react'
import type { Section, Show, TicketPlan } from '../types'
import { useStore } from '../store'
import { formatShowDate, money } from '../seats'
import ArenaMap from './ArenaMap'
import Modal from './Modal'

export function planSummary(plan: TicketPlan, sections: Section[]) {
  const names = plan.rankedSectionIds.map((id) => sections.find((s) => s.id === id)?.name ?? id)
  return `${plan.quantity} ${plan.quantity === 1 ? 'ticket' : 'tickets together'}, up to ${money(plan.maxPricePerTicket)} each. ${names.join(' → ') || 'No sections chosen yet'}. ${plan.rule === 'ask-me' ? 'Ask me first.' : 'Move to my next choice automatically.'}`
}

interface Props {
  show: Show
  onClose: () => void
  onSaved: (plan: TicketPlan) => void
}

// The heart of the Preparation stage: quantity, budget, ranked sections and what to do if one sells out.
export default function PlanModal({ show, onClose, onSaved }: Props) {
  const store = useStore()
  const arena = store.arenaOf(show)
  const existing = store.planFor(show.id)
  const [plan, setPlan] = useState<TicketPlan>(
    existing ?? { showId: show.id, quantity: 2, maxPricePerTicket: 180, rankedSectionIds: [], rule: 'ask-me' },
  )

  const toggle = (s: Section) => {
    const ids = plan.rankedSectionIds
    if (ids.includes(s.id)) setPlan({ ...plan, rankedSectionIds: ids.filter((x) => x !== s.id) })
    else if (ids.length < 3) setPlan({ ...plan, rankedSectionIds: [...ids, s.id] })
  }

  const setBudget = (max: number) =>
    setPlan({
      ...plan,
      maxPricePerTicket: max,
      rankedSectionIds: plan.rankedSectionIds.filter((id) => (arena.sections.find((s) => s.id === id)?.price ?? 0) <= max),
    })

  return (
    <Modal title="Set your ticket plan" onClose={onClose} wide>
      <div className="stack" style={{ marginTop: 8 }}>
        <p className="muted small">{arena.name}, {arena.city} · {formatShowDate(show.date, arena.timeZone)}</p>

        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field" style={{ marginBottom: 6 }}>How many seats together?</legend>
          <div className="row">
            <button className="icon-btn" style={{ border: '1.5px solid var(--border)' }} aria-label="One fewer ticket" disabled={plan.quantity <= 1} onClick={() => setPlan({ ...plan, quantity: plan.quantity - 1 })}>−</button>
            <output className="num" style={{ fontSize: 24, fontWeight: 700, minWidth: 32, textAlign: 'center' }} aria-live="polite">{plan.quantity}</output>
            <button className="icon-btn" style={{ border: '1.5px solid var(--border)' }} aria-label="One more ticket" disabled={plan.quantity >= 8} onClick={() => setPlan({ ...plan, quantity: plan.quantity + 1 })}>+</button>
            <span className="small muted">seats together (max 8)</span>
          </div>
        </fieldset>

        <label className="field">
          <span>Max price per ticket: <b>{money(plan.maxPricePerTicket)}</b></span>
          <input type="range" min={90} max={260} step={5} value={plan.maxPricePerTicket} onChange={(e) => setBudget(Number(e.target.value))} />
          <span className="hint">Your price guardrail. Sections above it are switched off so prices can't surprise you.</span>
        </label>

        <div className="stack-sm">
          <span className="field">Pick up to 3 sections, in order of preference</span>
          <span className="hint small muted">Tap to rank 1 → 2 → 3. Tap again to remove.</span>
          <ArenaMap
            arena={arena}
            label="Choose your sections"
            rankedIds={plan.rankedSectionIds}
            pressed={(s) => plan.rankedSectionIds.includes(s.id)}
            disabledReason={(s) => (s.price > plan.maxPricePerTicket ? `Over your ${money(plan.maxPricePerTicket)} budget` : !plan.rankedSectionIds.includes(s.id) && plan.rankedSectionIds.length >= 3 ? 'You already have 3 choices' : null)}
            onSelect={toggle}
          />
        </div>

        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field" style={{ marginBottom: 6 }}>If a section sells out before your turn</legend>
          <label className="checkbox">
            <input type="radio" name="rule" checked={plan.rule === 'ask-me'} onChange={() => setPlan({ ...plan, rule: 'ask-me' })} />
            <span><b>Ask me first</b><br /><span className="small muted">We'll pop up and you choose, with 60 seconds to decide.</span></span>
          </label>
          <label className="checkbox">
            <input type="radio" name="rule" checked={plan.rule === 'auto-next'} onChange={() => setPlan({ ...plan, rule: 'auto-next' })} />
            <span><b>Move to my next choice automatically</b><br /><span className="small muted">Best if you want to look away completely.</span></span>
          </label>
        </fieldset>

        <div className="card card-tight surface" aria-live="polite">
          <span className="eyebrow">Your plan</span>
          <p style={{ marginTop: 4 }}>{planSummary(plan, arena.sections)}</p>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!plan.rankedSectionIds.length}
            onClick={() => {
              store.savePlan(plan)
              onSaved(plan)
            }}
          >
            Save my plan
          </button>
        </div>
      </div>
    </Modal>
  )
}
