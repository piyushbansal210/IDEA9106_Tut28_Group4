import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { setMatchArtist, setTheme, themes, themeTokens, useTheme } from '../theme'
import Icon from './Icon'

export default function ThemePicker() {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return
    const active = themes.findIndex((t) => t.id === theme.chosen)
    swatchRefs.current[Math.max(0, active)]?.focus()
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open]) // only on open, so focus doesn't jump while picking

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const move = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 }[e.key]
    if (move) {
      e.preventDefault()
      swatchRefs.current[(i + move + themes.length) % themes.length]?.focus()
    }
  }

  return (
    <div className="relative" ref={wrap} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button className="icon-btn" aria-label="Change colour theme" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <Icon name="palette" size={22} />
      </button>
      {open && (
        <div className="theme-pop" role="dialog" aria-label="Colour theme">
          <strong>Colour theme</strong>
          <p className="small muted">The navbar and buttons change instantly. Text colour adjusts itself to stay readable.</p>
          <div className="swatches" role="radiogroup" aria-label="Theme colours">
            {themes.map((t, i) => {
              const fg = themeTokens(t.swatch)['--nav-fg']
              const checked = theme.chosen === t.id
              return (
                <button
                  key={t.id}
                  ref={(el) => { swatchRefs.current[i] = el }}
                  className="swatch"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => setTheme(t.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                >
                  <span className="swatch-dot" style={{ background: t.swatch, color: fg }}>
                    {checked && <Icon name="check" />}
                  </span>
                  {t.name}
                </button>
              )
            })}
          </div>
          <label className="checkbox small">
            <input type="checkbox" checked={theme.matchArtist} onChange={(e) => setMatchArtist(e.target.checked)} />
            <span>Match the artist on tour pages</span>
          </label>
          <button className="link-btn small" style={{ marginTop: 12 }} onClick={() => setTheme('noir')}>
            Reset to black
          </button>
        </div>
      )}
    </div>
  )
}
