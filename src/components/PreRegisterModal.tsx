import { useState } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { navigate } from '../router'
import { showPath } from '../sale'
import { formatShowDate } from '../seats'
import { PRESALE_WINDOW_DAYS, QUESTION_SECONDS, daysUntilSale } from '../streak'
import Modal from './Modal'

// Replaces "Remind me": the fan picks how to hear from us, then lands on their pre-sale hub.
export default function PreRegisterModal() {
  const store = useStore()
  const presale = usePresale()
  const show = store.findShow(presale.preRegisterFor ?? undefined)
  if (!show) return null
  return <Form key={show.id} showId={show.id} />
}

function Form({ showId }: { showId: string }) {
  const store = useStore()
  const presale = usePresale()
  const show = store.findShow(showId)!
  const tour = store.tourOf(show)
  const artist = store.artistOf(tour)
  const arena = store.arenaOf(show)
  const existing = presale.registrationFor(showId)
  const [push, setPush] = useState(existing?.push ?? true)
  const [email, setEmail] = useState(existing?.email ?? true)
  const [quiet, setQuiet] = useState(!!existing?.quietHours || !existing)
  const [from, setFrom] = useState(existing?.quietHours?.from ?? '22:00')
  const [to, setTo] = useState(existing?.quietHours?.to ?? '08:00')
  const days = daysUntilSale(show.saleOpensAt, presale.presaleNow(show))

  const save = () => {
    presale.register(showId, { push, email, quietHours: quiet ? { from, to } : undefined })
    presale.closePreRegister()
    store.toast(existing ? 'Your pre-sale settings are saved.' : `You're pre-registered for ${artist.name} in ${arena.city}.`)
    if (!existing) navigate(showPath(show, 'hub'))
  }

  return (
    <Modal title={existing ? `Pre-sale settings: ${artist.name}` : `Pre-register for ${artist.name}`} onClose={presale.closePreRegister}>
      <div className="stack" style={{ marginTop: 8 }}>
        <p className="muted small">
          {tour.name} · {arena.city}, {arena.name}. Sale opens {formatShowDate(show.saleOpensAt, arena.timeZone)}
          {days > 0 ? ` (in ${days} ${days === 1 ? 'day' : 'days'})` : ''}.
        </p>
        <div className="card card-tight surface">
          A daily {QUESTION_SECONDS}-second {artist.name} question for the {PRESALE_WINDOW_DAYS} days before the sale, and tips so you're ready when it opens.
        </div>
        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field" style={{ marginBottom: 6 }}>How should we reach you?</legend>
          <label className="switch"><span>Push notifications <span className="small muted">(one a day)</span></span><input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /></label>
          <label className="switch"><span>Tips by email <span className="small muted">(7 days and 1 day before)</span></span><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /></label>
          <label className="switch"><span>Quiet hours <span className="small muted">(no pushes)</span></span><input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} /></label>
          {quiet && (
            <div className="time-row small">
              <label>From <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label>to <input type="time" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </div>
          )}
        </fieldset>
        <p className="small"><b>Your streak never changes your place in the queue.</b> Everyone in the waiting room still gets a random place.</p>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {existing ? (
            <button className="btn btn-ghost" onClick={() => { presale.unregister(showId); presale.closePreRegister(); store.toast('You\'re no longer pre-registered for this show.') }}>
              Unregister
            </button>
          ) : <span />}
          <div className="row">
            <button className="btn btn-ghost" onClick={presale.closePreRegister}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>{existing ? 'Save' : 'Pre-register'}</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
