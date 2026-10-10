import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { CaptchaStore, imageChallenge, textChallenge } from './captcha.ts'

// Optional hardened host for QuickSeat: serves the built site with rate limits, security headers and a
// self-hosted CAPTCHA. The app still works without it (e.g. on GitHub Pages), just without the CAPTCHA.

const PORT = Number(process.env.PORT ?? 3001)
const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const minutes = (n: number) => n * 60_000

const app = express()
// Behind a host's load balancer (Render, Railway, nginx) set TRUST_PROXY=1 so limits apply per visitor, not per proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 0))

// The theme script in index.html runs before React loads; allow exactly that script by its hash, not 'unsafe-inline'.
const indexFile = `${DIST}index.html`
const inlineScriptHashes = existsSync(indexFile)
  ? [...readFileSync(indexFile, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
      (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
    )
  : []

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...inlineScriptHashes],
        // React style={{}} props and the theme engine set inline styles.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        // Admins can point a tour poster at any https image.
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        frameSrc: ['https://open.spotify.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        // Off so the site still loads when served over plain HTTP (e.g. a classroom demo on a LAN IP).
        upgradeInsecureRequests: null,
      },
    },
  }),
)

const tooMany = (message: string) => (_req: Request, res: Response) => res.status(429).json({ error: message })

// Every request, including the page and its assets. A normal visit is about 5 requests.
app.use(rateLimit({ windowMs: minutes(15), limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany('Too many requests. Please wait a few minutes.') }))

const api = express.Router()
api.use(rateLimit({ windowMs: minutes(15), limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany('Too many requests. Please wait a few minutes.') }))
// Tiny bodies only: nothing the API accepts is bigger than an id and an answer.
api.use(express.json({ limit: '1kb' }))
api.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

const captchas = new CaptchaStore()
const newCaptchaLimit = rateLimit({ windowMs: minutes(10), limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany('Too many new CAPTCHAs. Please wait a few minutes.') })
const verifyLimit = rateLimit({ windowMs: minutes(5), limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, handler: tooMany('Too many CAPTCHA attempts. Please wait a few minutes.') })

api.get('/health', (_req, res) => {
  res.json({ ok: true, captcha: true })
})

api.get('/captcha', newCaptchaLimit, (req, res) => {
  const mode = req.query.mode === 'text' ? 'text' : 'image'
  const c = mode === 'text' ? textChallenge() : imageChallenge()
  res.json({ id: captchas.create(c.answer), mode, svg: c.svg, question: c.question })
})

api.post('/captcha/verify', verifyLimit, (req, res) => {
  const { id, answer } = req.body ?? {}
  if (typeof id !== 'string' || typeof answer !== 'string' || id.length > 64 || answer.length > 16) {
    return res.status(400).json({ error: 'Invalid request.' })
  }
  const result = captchas.verify(id, answer)
  if (result === 'ok') return res.json({ ok: true })
  res.status(400).json({ ok: false, error: result === 'expired' ? 'That CAPTCHA expired. Here is a new one.' : 'That answer doesn\'t match. Try the new one.' })
})

api.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

app.use('/api', api)

if (existsSync(indexFile)) {
  // Vite fingerprints asset names, so they can be cached for a year; index.html must always be fresh.
  app.use('/assets', express.static(`${DIST}assets`, { immutable: true, maxAge: '1y', fallthrough: false }))
  app.use(express.static(DIST, { index: false, maxAge: '1h' }))
  app.get('/', (_req, res) => {
    res.set('Cache-Control', 'no-cache')
    res.sendFile(indexFile)
  })
} else {
  console.warn('dist/ not found: run "npm run build:server" first. Serving the API only.')
}

app.use((_req, res) => {
  res.status(404).type('text').send('Not found')
})

app.use((err: { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' })
  if (err.status === 404) return res.status(404).type('text').send('Not found')
  console.error(err)
  res.status(500).json({ error: 'Something went wrong.' })
})

const server = app.listen(PORT, () => {
  console.log(`QuickSeat server on http://localhost:${PORT}`)
})

// Drop clients that send headers or bodies very slowly ("slowloris"), so they can't tie up connections.
server.headersTimeout = 10_000
server.requestTimeout = 15_000
server.keepAliveTimeout = 5_000
server.maxHeadersCount = 50
