import { useEffect, useId, useRef, type ReactNode } from 'react'
import Icon from './Icon'

interface Props {
  title: ReactNode
  onClose?: () => void
  children: ReactNode
  wide?: boolean
  hideTitle?: boolean
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, iframe, [tabindex]:not([tabindex="-1"])'

// Accessible dialog: traps focus, closes on Esc, and returns focus to whatever opened it.
export default function Modal({ title, onClose, children, wide, hideTitle }: Props) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const node = ref.current!
    const first = node.querySelector<HTMLElement>('[data-autofocus]') ?? node.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) {
        e.stopPropagation()
        closeRef.current()
      }
      if (e.key !== 'Tab') return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return
      const [a, z] = [items[0], items[items.length - 1]]
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault()
        z.focus()
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault()
        a.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        {onClose && (
          <button className="icon-btn modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={22} />
          </button>
        )}
        <h2 id={id} className={hideTitle ? 'visually-hidden' : undefined} style={{ fontSize: 24, paddingRight: 32 }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
