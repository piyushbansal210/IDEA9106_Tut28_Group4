import { useDocumentTitle } from './shared'

const faqs = [
  { q: 'What is a ticket plan?', a: 'Before the sale you choose how many seats together, your maximum price and up to three sections in order. The queue then tracks those sections for you and tells you if anything changes.' },
  { q: 'Is the queue fair?', a: 'Everyone in the waiting room when the sale opens gets a random place. Joining earlier, refreshing or opening extra tabs doesn\'t change it.' },
  { q: 'What do Likely, At risk and Unlikely mean?', a: 'They compare where you are in the queue with where each section is expected to run out. Likely means it should still have seats at your turn; At risk means it may run out around your turn.' },
  { q: 'Can I look away while I wait?', a: 'Yes. Your place is kept. Turn on notifications and the alert chime and we\'ll tell you when your plan changes or it\'s your turn.' },
  { q: 'Does music play automatically?', a: 'Never. The record player in the corner only plays when you tap it, and you can minimise it at any time.' },
  { q: 'Accessibility', a: 'QuickSeat works with a keyboard and screen reader, respects reduced-motion settings, and keeps text readable in every colour theme.' },
]

export default function HelpPage() {
  useDocumentTitle('Help')
  return (
    <div className="container page narrow stack-lg">
      <h1>Help and FAQ</h1>
      <div className="stack">
        {faqs.map((f) => (
          <details key={f.q} className="card card-tight">
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
            <p className="muted" style={{ marginTop: 8 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
