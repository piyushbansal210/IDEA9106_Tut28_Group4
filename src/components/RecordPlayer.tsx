import { useEffect, useState } from 'react'
import { artists } from '../data'
import { useStore } from '../store'
import { nextTrack, openSpotify, pause, play, setExpanded, setMinimized, setPrefs, setVolume, trackTitle, useMusic, usePrefs } from '../audio'
import Icon from './Icon'

function Vinyl({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <g className="vinyl">
        <circle cx="36" cy="36" r="34" fill="#141414" />
        {[29, 24, 19].map((r) => <circle key={r} cx="36" cy="36" r={r} fill="none" stroke="#2c2c2c" strokeWidth="1" />)}
        <circle cx="36" cy="36" r="12" fill={label} />
        <path d="M30 31a8 8 0 0 1 6-3" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
        <circle cx="36" cy="36" r="2" fill="#141414" />
      </g>
      <g className="tonearm">
        <circle cx="62" cy="8" r="4" fill="#bbb" />
        <path d="M62 8 L58 34 L50 42" stroke="#ddd" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="46" y="40" width="7" height="5" rx="1" fill="#eee" transform="rotate(45 49 42)" />
      </g>
    </svg>
  )
}

// Opt-in soundtrack: never plays until the record is clicked.
export default function RecordPlayer() {
  const music = useMusic()
  const prefs = usePrefs()
  const { toast } = useStore()
  const [tip, setTip] = useState(false)
  const artist = artists.find((a) => a.id === music.artistId)

  useEffect(() => {
    if (!artist || prefs.tipSeen || music.focusMode) return
    setTip(true)
    const t = setTimeout(() => {
      setTip(false)
      setPrefs({ tipSeen: true })
    }, 6000)
    return () => clearTimeout(t)
  }, [artist, prefs.tipSeen, music.focusMode])

  if (!artist) return null
  if (music.focusMode && !music.pausedForFocus) return null

  const dismissTip = () => {
    setTip(false)
    setPrefs({ tipSeen: true })
  }

  if (music.minimized) {
    return (
      <button className="record-tab" onClick={() => setMinimized(false)} aria-label="Show the record player">
        <Icon name="music" />
      </button>
    )
  }

  const title = music.clipTitle ?? trackTitle(artist.id, music.trackIndex)
  const label = artist.posterGradient[0]

  return (
    <div className="record-dock">
      {tip && !music.expanded && <div className="record-tip" role="status">Want a soundtrack while you wait? Tap the record.</div>}

      {music.expanded && (
        <section className="player-card" aria-label="Record player">
          <div className="row between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow">{music.spotifyOpen ? 'Spotify' : music.playing ? 'Now playing' : 'Paused'}</div>
              <strong style={{ display: 'block' }}>{music.spotifyOpen ? `${artist.name} on Spotify` : title}</strong>
              <span className="small muted">{artist.name} · {music.spotifyOpen ? 'previews, or full tracks if you\'re logged in to Spotify' : 'generated mood loop'}</span>
            </div>
            <div className="row" style={{ gap: 0, flexWrap: 'nowrap', flex: 'none', margin: '-8px -8px 0 0' }}>
              <button className="icon-btn" onClick={() => setMinimized(true)} aria-label="Minimise record player"><Icon name="minimize" size={20} /></button>
              <button className="icon-btn" onClick={() => setExpanded(false)} aria-label="Close player card"><Icon name="x" size={20} /></button>
            </div>
          </div>

          {!music.spotifyOpen && (
            <div className="row" style={{ marginTop: 12, flexWrap: 'nowrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => (music.playing ? pause() : play())} aria-pressed={music.playing} aria-label={music.playing ? 'Pause' : 'Play'}>
                <Icon name={music.playing ? 'pause' : 'play'} size={16} />
              </button>
              <button className="icon-btn" onClick={nextTrack} aria-label="Next track"><Icon name="next" size={20} /></button>
              <Icon name="volume" size={18} />
              <label className="visually-hidden" htmlFor="rp-volume">Volume</label>
              <input id="rp-volume" type="range" min={0} max={1} step={0.05} value={music.volume} onChange={(e) => setVolume(Number(e.target.value))} />
            </div>
          )}

          {music.spotifyOpen && (
            <iframe
              title={`${artist.name} on Spotify`}
              src={`https://open.spotify.com/embed/artist/${artist.spotifyArtistId}?utm_source=generator`}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          )}

          <div className="row" style={{ marginTop: 12 }}>
            {music.spotifyOpen ? (
              <button className="btn btn-ghost btn-sm" onClick={play}>Back to the loop</button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={openSpotify}>Hear {artist.name} on Spotify</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => toast('Connecting your Spotify account is coming soon.')}>Connect Spotify</button>
          </div>
        </section>
      )}

      <div className={`relative ${music.playing ? 'spinning' : ''}`}>
        {music.pausedForFocus && <span className="paused-note">Paused so you can focus</span>}
        <button
          className="record-btn"
          onClick={() => {
            dismissTip()
            if (music.playing) setExpanded(!music.expanded)
            else play()
          }}
          aria-label={music.playing ? `Record player playing ${title}. Show controls` : `Play a soundtrack for ${artist.name}`}
          aria-pressed={music.playing}
        >
          <Vinyl label={label} />
        </button>
      </div>
    </div>
  )
}
