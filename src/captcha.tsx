import { useCallback, useEffect, useState } from 'react'

// Talks to the optional QuickSeat server (server/index.ts). Where there's no server, such as on GitHub Pages,
// there's nothing to verify against, so the CAPTCHA is skipped rather than faked in the browser.

type Mode = 'image' | 'text'

interface Challenge {
  id: string
  mode: Mode
  svg?: string
  question?: string
}

let probe: Promise<boolean> | null = null
const serverAvailable = () =>
  (probe ??= fetch('/api/health')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j?.captcha === true)
    .catch(() => false))

async function errorOf(res: Response) {
  const data = await res.json().catch(() => null)
  return (data?.error as string | undefined) ?? `Request failed (${res.status}).`
}

export function useCaptcha() {
  const [available, setAvailable] = useState(false)
  const [mode, setMode] = useState<Mode>('image')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async (m: Mode) => {
    setAnswer('')
    try {
      const res = await fetch(`/api/captcha?mode=${m}`)
      if (!res.ok) return setError(await errorOf(res))
      setChallenge(await res.json())
    } catch {
      setError('Couldn\'t load the CAPTCHA. Check your connection.')
    }
  }, [])

  useEffect(() => {
    let live = true
    serverAvailable().then((ok) => {
      if (!live || !ok) return
      setAvailable(true)
      void load('image')
    })
    return () => {
      live = false
    }
  }, [load])

  // Resolves to an error message, or null when the visitor passed (or there's no server to check with).
  // Every challenge is single-use on the server, so a fresh one is loaded after each check.
  const verify = async (): Promise<string | null> => {
    if (!available) return null
    if (!challenge) return error || 'The CAPTCHA is still loading.'
    if (!answer.trim()) return 'Answer the CAPTCHA to continue.'
    try {
      const res = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: challenge.id, answer }),
      })
      if (res.ok) {
        setError('')
        return null
      }
      return await errorOf(res)
    } catch {
      return 'Couldn\'t check the CAPTCHA. Check your connection.'
    } finally {
      void load(mode)
    }
  }

  const switchMode = () => {
    const next = mode === 'image' ? 'text' : 'image'
    setMode(next)
    void load(next)
  }

  const field = available ? (
    <fieldset className="captcha">
      <legend className="field">Quick check that you're a person</legend>
      {challenge?.mode === 'image' && challenge.svg && (
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(challenge.svg)}`} width={180} height={60} alt="Distorted characters to type. Use the text question instead if you can't read them." />
      )}
      {challenge?.mode === 'text' && <p style={{ margin: 0 }}><b>{challenge.question}</b></p>}
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          aria-label={mode === 'image' ? 'Characters in the picture' : 'Answer as a number'}
          inputMode={mode === 'text' ? 'numeric' : 'text'}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={16}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load(mode)}>New one</button>
      </div>
      <button type="button" className="link-btn small" onClick={switchMode}>
        {mode === 'image' ? 'Can\'t read it? Answer a text question instead' : 'Use the picture instead'}
      </button>
      {error && <p className="error-text" role="alert" style={{ margin: 0 }}>{error}</p>}
    </fieldset>
  ) : null

  return { field, verify }
}
