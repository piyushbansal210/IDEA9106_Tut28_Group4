import { useState, type FormEvent } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import { arenas } from '../data'
import { money } from '../seats'
import type { Show } from '../types'
import StatusBadge from '../components/StatusBadge'
import { LoginGate, useDocumentTitle } from './shared'

// datetime-local inputs work in local time without a zone.
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const fromLocalInput = (v: string) => new Date(v).toISOString()

function ShowEditor({ show }: { show: Show }) {
  const store = useStore()
  const sold = store.bookings.filter((b) => b.showId === show.id).reduce((n, b) => n + b.seats.length, 0)
  const revenue = store.bookings.filter((b) => b.showId === show.id).reduce((n, b) => n + b.total, 0)
  return (
    <tr>
      <td>
        <select className="input" aria-label="Arena" value={show.arenaId} disabled={sold > 0} title={sold > 0 ? 'Locked because tickets have been sold' : undefined} onChange={(e) => store.updateShow(show.id, { arenaId: e.target.value })}>
          {arenas.map((a) => <option key={a.id} value={a.id}>{a.city} · {a.name}</option>)}
        </select>
      </td>
      <td><input className="input" type="datetime-local" aria-label="Show date" value={toLocalInput(show.date)} onChange={(e) => e.target.value && store.updateShow(show.id, { date: fromLocalInput(e.target.value) })} /></td>
      <td><input className="input" type="datetime-local" aria-label="Sale opens" value={toLocalInput(show.saleOpensAt)} onChange={(e) => e.target.value && store.updateShow(show.id, { saleOpensAt: fromLocalInput(e.target.value) })} /></td>
      <td>
        <div className="stack-sm">
          <StatusBadge status={store.statusOf(show)} />
          <label className="checkbox small"><input type="checkbox" checked={!!show.soldOut} onChange={(e) => store.updateShow(show.id, { soldOut: e.target.checked })} /> Mark sold out</label>
          <label className="checkbox small"><input type="checkbox" checked={show.hasQueue} onChange={(e) => store.updateShow(show.id, { hasQueue: e.target.checked })} /> Use queue</label>
        </div>
      </td>
      <td><input className="input" type="number" aria-label="Ticket limit" min={sold} style={{ width: 110 }} value={show.ticketLimit} onChange={(e) => store.updateShow(show.id, { ticketLimit: Math.max(sold, Number(e.target.value)) })} /></td>
      <td className="num">{sold}<br /><span className="muted">{money(revenue)}</span></td>
      <td><button className="btn btn-danger btn-sm" onClick={() => confirm('Delete this show and its bookings?') && store.deleteShow(show.id)}>Delete</button></td>
    </tr>
  )
}

function Admin() {
  const store = useStore()
  const presale = usePresale()
  useDocumentTitle('Admin')
  const [form, setForm] = useState({ tourId: store.tours[0]?.id ?? '', arenaId: arenas[0].id, date: '', saleOpensAt: '', ticketLimit: 12000, hasQueue: true })

  if (store.user?.role !== 'admin') {
    return <div className="container page"><div className="empty">Only admins can see this page.</div></div>
  }

  const ticketsSold = store.bookings.reduce((n, b) => n + b.seats.length, 0)
  const revenue = store.bookings.reduce((n, b) => n + b.total, 0)

  const add = (e: FormEvent) => {
    e.preventDefault()
    store.addShow({ tourId: form.tourId, arenaId: form.arenaId, date: fromLocalInput(form.date), saleOpensAt: fromLocalInput(form.saleOpensAt), ticketLimit: form.ticketLimit, hasQueue: form.hasQueue })
    store.toast('Show added.')
  }

  return (
    <div className="container page stack-lg">
      <div className="row between">
        <h1>Admin dashboard</h1>
        <button className="btn btn-secondary" onClick={() => confirm('Reset all demo data? Bookings, plans and edits are cleared.') && (store.resetDemo(), presale.resetPresale())}>Reset demo data</button>
      </div>

      <section className="stats">
        <div className="card stat"><span className="small muted">Tickets sold</span><b>{ticketsSold}</b></div>
        <div className="card stat"><span className="small muted">Revenue</span><b>{money(revenue)}</b></div>
        <div className="card stat"><span className="small muted">Shows</span><b>{store.shows.length}</b></div>
        <div className="card stat"><span className="small muted">Waitlist sign-ups</span><b>{store.waitlists.length}</b></div>
      </section>

      {store.tours.map((tour) => (
        <section key={tour.id} className="card stack">
          <div className="form-grid">
            <label className="field">Tour name<input value={tour.name} onChange={(e) => store.updateTour(tour.id, { name: e.target.value })} /></label>
            <label className="field">Poster image URL<input placeholder={`/artists/${tour.artistId}.jpg`} value={tour.posterUrl ?? ''} onChange={(e) => store.updateTour(tour.id, { posterUrl: e.target.value || undefined })} /><span className="hint">Leave empty to use the generated poster.</span></label>
            <label className="field">Tagline<input value={tour.tagline} onChange={(e) => store.updateTour(tour.id, { tagline: e.target.value })} /></label>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Arena</th><th>Show date</th><th>Sale opens</th><th>Status</th><th>Ticket limit</th><th>Sold</th><th /></tr></thead>
              <tbody>{store.shows.filter((s) => s.tourId === tour.id).map((s) => <ShowEditor key={s.id} show={s} />)}</tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="card stack">
        <h2 style={{ fontSize: 24 }}>Add a show</h2>
        <form className="form-grid" onSubmit={add}>
          <label className="field">Tour<select value={form.tourId} onChange={(e) => setForm({ ...form, tourId: e.target.value })}>{store.tours.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className="field">Arena<select value={form.arenaId} onChange={(e) => setForm({ ...form, arenaId: e.target.value })}>{arenas.map((a) => <option key={a.id} value={a.id}>{a.city} · {a.name}</option>)}</select></label>
          <label className="field">Show date<input type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="field">Sale opens<input type="datetime-local" required value={form.saleOpensAt} onChange={(e) => setForm({ ...form, saleOpensAt: e.target.value })} /></label>
          <label className="field">Ticket limit<input type="number" min={1} value={form.ticketLimit} onChange={(e) => setForm({ ...form, ticketLimit: Number(e.target.value) })} /></label>
          <label className="checkbox" style={{ alignSelf: 'center' }}><input type="checkbox" checked={form.hasQueue} onChange={(e) => setForm({ ...form, hasQueue: e.target.checked })} /> Sell through a queue</label>
          <div><button className="btn btn-primary" type="submit">Add show</button></div>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ fontSize: 24 }}>All bookings</h2>
        {store.bookings.length === 0 ? <p className="muted">No bookings yet.</p> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Customer</th><th>Show</th><th>Section</th><th>Tickets</th><th>Total</th><th>Booked</th></tr></thead>
              <tbody>
                {store.bookings.map((b) => {
                  const show = store.findShow(b.showId)
                  return (
                    <tr key={b.id}>
                      <td>{b.username}</td>
                      <td>{show ? `${store.tourOf(show).name} · ${store.arenaOf(show).city}` : '—'}</td>
                      <td>{show ? store.arenaOf(show).sections.find((s) => s.id === b.sectionId)?.name : '—'}</td>
                      <td>{b.seats.length}</td>
                      <td>{money(b.total)}</td>
                      <td>{new Date(b.createdAt).toLocaleString('en-AU')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default function AdminPage() {
  return (
    <LoginGate reason="Log in as an admin to manage tours.">
      <Admin />
    </LoginGate>
  )
}
