import { useState, type FormEvent } from 'react'
import type { Store } from '../store'
import type { Artist, Concert } from '../types'
import { api, type NewShow } from '../api'
import { arenas } from '../data'
import { capacity, formatDate, money, takenSeats } from '../seats'
import { authHref, href } from '../router'
import ArtistImage from '../components/ArtistImage'

type Tab = 'overview' | 'add' | 'shows' | 'artists' | 'bookings'
type Notify = (text: string, kind?: 'ok' | 'err') => void

const arenaById = (id: string) => arenas.find((a) => a.id === id)!
const cap = (arenaId: string) => capacity(arenaById(arenaId))

export default function AdminPage({ store }: { store: Store }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null)

  if (store.user?.role !== 'admin') {
    return (
      <div className="container block">
        <div className="empty">This page is for admins. <a href={authHref('login', 'admin')}>Log in as admin</a></div>
      </div>
    )
  }

  const notify: Notify = (text, kind = 'ok') => {
    setToast({ text, kind })
    setTimeout(() => setToast(null), 3500)
  }

  const tabs: [Tab, string][] = [
    ['overview', 'Overview'],
    ['add', 'Add shows'],
    ['shows', `Shows (${store.concerts.length})`],
    ['artists', `Artists (${store.artists.length})`],
    ['bookings', `Bookings (${store.bookings.length})`],
  ]

  return (
    <section className="container block admin">
      <div className="block-head">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Dashboard</h1>
        </div>
        <button className="btn primary sm" onClick={() => setTab('add')}>+ Add shows</button>
      </div>

      <div className="tabs admin-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview store={store} />}
      {tab === 'add' && <AddShows store={store} notify={notify} onDone={() => setTab('shows')} />}
      {tab === 'shows' && <ShowsManager store={store} notify={notify} />}
      {tab === 'artists' && <ArtistsManager store={store} notify={notify} />}
      {tab === 'bookings' && <Bookings store={store} />}

      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}
    </section>
  )
}

// ---- overview ------------------------------------------------------------

function Overview({ store }: { store: Store }) {
  const { concerts, bookings, taken } = store
  const revenue = bookings.reduce((n, b) => n + b.total, 0)
  const sold = Object.values(taken).reduce((n, s) => n + s.length, 0)
  const released = concerts.reduce((n, c) => n + c.ticketLimit, 0)
  const customers = new Set(bookings.map((b) => b.username)).size

  const ranked = concerts
    .map((c) => ({ c, sold: takenSeats(taken, c.id).size }))
    .sort((a, b) => b.sold / b.c.ticketLimit - a.sold / a.c.ticketLimit)
    .slice(0, 6)

  return (
    <>
      <div className="stat-grid">
        <div className="stat"><span>Revenue</span><strong>{money(revenue)}</strong></div>
        <div className="stat"><span>Tickets sold</span><strong>{sold}<small> / {released}</small></strong></div>
        <div className="stat"><span>Shows</span><strong>{concerts.length}</strong></div>
        <div className="stat"><span>Customers</span><strong>{customers}</strong></div>
      </div>
      <div className="panel">
        <h3>Best-selling shows</h3>
        <div className="bars">
          {ranked.map(({ c, sold }) => (
            <div key={c.id} className="bar-row">
              <span className="small">
                <strong>{c.artist}</strong> <span className="muted">· {arenaById(c.arenaId).city.split(',')[0]} · {formatDate(c.date)}</span>
              </span>
              <div className="meter"><span style={{ width: `${(sold / c.ticketLimit) * 100}%` }} /></div>
              <span className="tiny muted">{sold}/{c.ticketLimit}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ---- add shows -----------------------------------------------------------

function AddShows({ store, notify, onDone }: { store: Store; notify: Notify; onDone: () => void }) {
  const firstArena = arenas[0].id
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [profile, setProfile] = useState({ genre: '', imageUrl: '', bio: '' })
  const [shows, setShows] = useState<NewShow[]>([{ arenaId: firstArena, date: '', ticketLimit: cap(firstArena) }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const existing = store.artists.find((a) => a.name.toLowerCase() === artist.trim().toLowerCase())
  const isNew = artist.trim() !== '' && !existing
  const totalTickets = shows.reduce((n, s) => n + (Number(s.ticketLimit) || 0), 0)

  const pickArtist = (value: string) => {
    setArtist(value)
    // Suggest the artist's current tour name.
    const match = store.artists.find((a) => a.name.toLowerCase() === value.trim().toLowerCase())
    const lastTour = match && store.concerts.filter((c) => c.artist === match.name).at(-1)
    if (lastTour && !title) setTitle(lastTour.title)
  }

  const updateShow = (i: number, patch: Partial<NewShow>) =>
    setShows(shows.map((s, j) => {
      if (j !== i) return s
      const next = { ...s, ...patch }
      // Keep the ticket count within the new arena's capacity.
      if (patch.arenaId) next.ticketLimit = Math.min(s.ticketLimit === cap(s.arenaId) ? cap(patch.arenaId) : s.ticketLimit, cap(patch.arenaId))
      return next
    }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (shows.some((s) => !s.date)) return setError('Every show needs a date.')
    setBusy(true)
    try {
      const created = await api.addTour({
        artist: existing?.name ?? artist.trim(),
        title: title.trim(),
        description: description.trim(),
        shows: shows.map((s) => ({ ...s, ticketLimit: Number(s.ticketLimit) })),
        ...(isNew ? profile : {}),
      })
      await store.reload()
      notify(`Added ${created.length} show${created.length > 1 ? 's' : ''} for ${created[0].artist}.`)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <div className="form-section">
        <h3>1. Artist & tour</h3>
        <label className="field">
          <span>Artist</span>
          <input list="artist-list" value={artist} onChange={(e) => pickArtist(e.target.value)} placeholder="Start typing or add a new artist" required />
          <datalist id="artist-list">{store.artists.map((a) => <option key={a.name} value={a.name} />)}</datalist>
          {existing && (
            <small className="hint ok">
              {existing.name} already has {store.concerts.filter((c) => c.artist === existing.name).length} show(s). New dates will be added.
            </small>
          )}
        </label>

        {isNew && (
          <div className="new-artist">
            <ArtistImage name={artist} src={profile.imageUrl || undefined} className="preview" />
            <div className="new-artist-fields">
              <small className="hint">New artist – add a profile (optional)</small>
              <label className="field"><span>Photo URL</span>
                <input value={profile.imageUrl} onChange={(e) => setProfile({ ...profile, imageUrl: e.target.value })} placeholder="https://… or /artists/name.jpg" />
              </label>
              <label className="field"><span>Genre</span>
                <input value={profile.genre} onChange={(e) => setProfile({ ...profile, genre: e.target.value })} placeholder="Pop, Rock, Hip-hop…" />
              </label>
              <label className="field"><span>Short bio</span>
                <input value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </label>
            </div>
          </div>
        )}

        <label className="field">
          <span>Tour / show title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. World Tour 2027" />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should fans know about these shows?" />
        </label>
      </div>

      <div className="form-section">
        <h3>2. Shows & tickets</h3>
        <p className="muted small">Add one row per show. Set how many tickets go on sale – up to the arena's capacity.</p>
        <div className="show-rows">
          {shows.map((s, i) => (
            <div key={i} className="show-edit">
              <span className="num">{i + 1}</span>
              <label className="field">
                <span>Arena</span>
                <select value={s.arenaId} onChange={(e) => updateShow(i, { arenaId: e.target.value })}>
                  {arenas.map((a) => <option key={a.id} value={a.id}>{a.name} – {a.city.split(',')[0]}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Date</span>
                <input type="date" value={s.date} onChange={(e) => updateShow(i, { date: e.target.value })} required />
              </label>
              <label className="field">
                <span>Tickets</span>
                <input
                  type="number"
                  min={1}
                  max={cap(s.arenaId)}
                  value={s.ticketLimit}
                  onChange={(e) => updateShow(i, { ticketLimit: e.target.value === '' ? 0 : Number(e.target.value) })}
                  required
                />
                <small className="hint">of {cap(s.arenaId)} seats</small>
              </label>
              <button
                type="button"
                className="icon-btn"
                aria-label="Remove show"
                disabled={shows.length === 1}
                onClick={() => setShows(shows.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            const last = shows.at(-1)!
            setShows([...shows, { arenaId: last.arenaId, date: '', ticketLimit: last.ticketLimit }])
          }}
        >
          + Add another show
        </button>
      </div>

      <div className="form-footer">
        <span className="muted small">
          Creates <strong>{shows.length}</strong> show{shows.length > 1 ? 's' : ''} with <strong>{totalTickets}</strong> tickets in total
        </span>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Publish shows'}</button>
      </div>
    </form>
  )
}

// ---- manage shows --------------------------------------------------------

function ShowsManager({ store, notify }: { store: Store; notify: Notify }) {
  const byArtist = [...new Set(store.concerts.map((c) => c.artist))].sort()
  return (
    <div className="manager">
      {byArtist.map((name) => {
        const shows = store.concerts.filter((c) => c.artist === name)
        const artist = store.artists.find((a) => a.name === name)
        return (
          <div key={name} className="panel artist-group">
            <div className="group-head">
              <ArtistImage name={name} src={artist?.imageUrl} className="avatar-img" />
              <div>
                <h3>{name}</h3>
                <span className="muted small">{shows.length} show{shows.length > 1 ? 's' : ''}</span>
              </div>
              <a className="btn ghost sm" href={href('artists', name)}>View page</a>
            </div>
            {shows.map((c) => <ShowEditor key={c.id} concert={c} store={store} notify={notify} />)}
          </div>
        )
      })}
    </div>
  )
}

function ShowEditor({ concert, store, notify }: { concert: Concert; store: Store; notify: Notify }) {
  const [draft, setDraft] = useState(concert)
  const [busy, setBusy] = useState(false)
  const sold = takenSeats(store.taken, concert.id).size
  const revenue = store.bookings.filter((b) => b.concertId === concert.id).reduce((n, b) => n + b.total, 0)
  const dirty = draft.arenaId !== concert.arenaId || draft.date !== concert.date || draft.ticketLimit !== concert.ticketLimit

  const save = async () => {
    setBusy(true)
    try {
      await api.updateConcert(draft)
      await store.reload()
      notify('Show updated.')
    } catch (err) {
      notify((err as Error).message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Delete ${concert.artist} on ${formatDate(concert.date)}?${sold ? ` ${sold} sold tickets will be cancelled.` : ''}`)) return
    try {
      await api.deleteConcert(concert.id)
      await store.reload()
      notify('Show deleted.')
    } catch (err) {
      notify((err as Error).message, 'err')
    }
  }

  return (
    <div className="show-editor">
      <label className="field">
        <span>Date</span>
        <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
      </label>
      <label className="field">
        <span>Arena {sold > 0 && <em className="tiny muted">(locked)</em>}</span>
        <select
          value={draft.arenaId}
          disabled={sold > 0}
          title={sold > 0 ? 'Arena is locked because tickets have been sold.' : undefined}
          onChange={(e) => setDraft({ ...draft, arenaId: e.target.value, ticketLimit: Math.min(draft.ticketLimit, cap(e.target.value)) })}
        >
          {arenas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Tickets <em className="tiny muted">(max {cap(draft.arenaId)})</em></span>
        <input
          type="number"
          min={Math.max(1, sold)}
          max={cap(draft.arenaId)}
          value={draft.ticketLimit}
          onChange={(e) => setDraft({ ...draft, ticketLimit: Number(e.target.value) })}
        />
      </label>
      <div className="editor-sales">
        <div className="meter"><span style={{ width: `${Math.min(100, (sold / Math.max(1, draft.ticketLimit)) * 100)}%` }} /></div>
        <span className="tiny muted">{sold} sold · {money(revenue)}</span>
      </div>
      <div className="editor-actions">
        {dirty && (
          <>
            <button className="btn primary sm" disabled={busy} onClick={save}>Save</button>
            <button className="btn ghost sm" onClick={() => setDraft(concert)}>Undo</button>
          </>
        )}
        <button className="icon-btn danger" aria-label="Delete show" title="Delete show" onClick={remove}>🗑</button>
      </div>
    </div>
  )
}

// ---- artists -------------------------------------------------------------

function ArtistsManager({ store, notify }: { store: Store; notify: Notify }) {
  return (
    <div className="artist-admin-grid">
      {store.artists.map((a) => <ArtistEditor key={a.name} artist={a} store={store} notify={notify} />)}
    </div>
  )
}

function ArtistEditor({ artist, store, notify }: { artist: Artist; store: Store; notify: Notify }) {
  const [draft, setDraft] = useState(artist)
  const dirty = JSON.stringify(draft) !== JSON.stringify(artist)
  const count = store.concerts.filter((c) => c.artist === artist.name).length

  const save = async () => {
    try {
      await api.saveArtist(draft)
      await store.reload()
      notify(`${artist.name} updated.`)
    } catch (err) {
      notify((err as Error).message, 'err')
    }
  }

  return (
    <div className="panel artist-editor">
      <ArtistImage name={artist.name} src={draft.imageUrl || undefined} className="editor-img" />
      <div className="artist-editor-body">
        <h3>{artist.name} <span className="muted small">· {count} show{count === 1 ? '' : 's'}</span></h3>
        <label className="field"><span>Photo URL</span>
          <input value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
        </label>
        <label className="field"><span>Genre</span>
          <input value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} />
        </label>
        <label className="field"><span>Bio</span>
          <textarea rows={2} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
        </label>
        {dirty && (
          <div className="editor-actions">
            <button className="btn primary sm" onClick={save}>Save</button>
            <button className="btn ghost sm" onClick={() => setDraft(artist)}>Undo</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- bookings ------------------------------------------------------------

function Bookings({ store }: { store: Store }) {
  if (store.bookings.length === 0) return <div className="empty">No bookings yet.</div>
  return (
    <div className="panel table-wrap">
      <table>
        <thead>
          <tr><th>Customer</th><th>Show</th><th>Seats</th><th>Total</th><th>Booked</th></tr>
        </thead>
        <tbody>
          {store.bookings.map((b) => {
            const c = store.concerts.find((x) => x.id === b.concertId)
            return (
              <tr key={b.id}>
                <td>@{b.username}</td>
                <td>{c ? <>{c.artist} <span className="muted">· {formatDate(c.date)}</span></> : '—'}</td>
                <td>{b.seats.length}</td>
                <td>{money(b.total)}</td>
                <td className="muted">{new Date(b.createdAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
