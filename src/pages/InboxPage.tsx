import { useEffect, useState } from 'react'
import { usePresale } from '../presale'
import { href } from '../router'
import { LoginGate, useDocumentTitle } from './shared'

const when = (iso: string) => new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// In-app stand-in for the fan's email inbox. Templates are our own and escaped, so rendering their HTML is safe.
function Inbox() {
  const presale = usePresale()
  const emails = presale.inbox
  const [openId, setOpenId] = useState<string | null>(emails[0]?.id ?? null)
  const open = emails.find((e) => e.id === openId) ?? emails[0]
  useDocumentTitle('Inbox')

  useEffect(() => {
    if (open && !open.read) presale.markEmailRead(open.id)
  }, [open?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container page stack-lg">
      <div className="stack-sm">
        <h1>Inbox</h1>
        <p className="muted">Tips emails from QuickSeat. This prototype doesn't send real email: messages arrive here instead.</p>
      </div>
      {emails.length === 0 ? (
        <div className="empty stack-sm">
          <strong>No emails yet.</strong>
          <p className="muted">Pre-registered fans get tips 7 days and 1 day before the sale, and a heads-up an hour before.</p>
          <a className="link-btn" href={href('/')}>Browse tours →</a>
        </div>
      ) : (
        <div className="inbox">
          <nav className="inbox-list" aria-label="Emails">
            {emails.map((e) => (
              <button key={e.id} className={`inbox-item ${e.read ? '' : 'unread'}`} aria-current={open?.id === e.id} onClick={() => setOpenId(e.id)}>
                <strong>{e.subject}</strong>
                <span className="small muted">{e.preheader}</span>
                <span className="tiny muted">{when(e.sentAt)}{e.read ? '' : ' · unread'}</span>
              </button>
            ))}
          </nav>
          {open && (
            <article className="inbox-read" aria-label={open.subject}>
              <p className="tiny muted" style={{ marginBottom: 12 }}>From: QuickSeat · {when(open.sentAt)}</p>
              <div className="email-shell" dangerouslySetInnerHTML={{ __html: open.html }} />
            </article>
          )}
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <LoginGate reason="Log in to see your QuickSeat emails.">
      <Inbox />
    </LoginGate>
  )
}
