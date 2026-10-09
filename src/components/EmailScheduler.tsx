import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { usePresale } from '../presale'
import type { EmailTemplate } from '../types'

// Simulates the tips emails: day 7, day 1 and one hour before the sale, once each per show.
// A real build would do this on a server with an email provider (see README).
export default function EmailScheduler() {
  const store = useStore()
  const presale = usePresale()
  const sent = useRef(new Set<string>())
  const user = store.user
  const minute = Math.floor(store.now / 60_000)

  useEffect(() => {
    if (!user) return
    for (const r of presale.myRegistrations) {
      const show = store.findShow(r.showId)
      if (!r.email || !show) continue
      const now = presale.presaleNow(show)
      const msToSale = Date.parse(show.saleOpensAt) - now
      const days = presale.streakFor(r.showId).daysUntil
      const template: EmailTemplate | null =
        msToSale > 0 && msToSale <= 60 * 60_000 ? 'hour-before' : days === 7 ? 'day-7' : days === 1 ? 'day-1' : null
      if (!template) continue
      const key = `${user.username}:${r.showId}:${template}`
      if (sent.current.has(key) || presale.allEmails.some((e) => `${e.username}:${e.showId}:${e.template}` === key)) continue
      sent.current.add(key)
      const email = presale.sendEmail(user.username, r.showId, template)
      if (email) store.toast(`New email: ${email.subject}`)
    }
  }, [user?.username, presale.demoDaysUntil, minute]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
