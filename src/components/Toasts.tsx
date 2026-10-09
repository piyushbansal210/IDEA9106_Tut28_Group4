import { useEffect, useState } from 'react'
import { useStore, type ToastItem } from '../store'

function Toast({ item }: { item: ToastItem }) {
  const { dismissToast } = useStore()
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => dismissToast(item.id), 5000)
    return () => clearTimeout(t)
  }, [paused, item.id, dismissToast])

  return (
    <div className="toast" role="status" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <span style={{ flex: 1 }}>{item.message}</span>
      <button onClick={() => dismissToast(item.id)} aria-label="Dismiss notification">×</button>
    </div>
  )
}

export default function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <Toast key={t.id} item={t} />)}
    </div>
  )
}
