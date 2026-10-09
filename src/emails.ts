// Tips emails for pre-registered fans. Pure templates: nothing is sent; the app stores them in an in-app inbox.
// Emails link back into the app and must never ask for card details or contain a form.
import type { EmailTemplate } from './types'

export interface EmailContext {
  name: string
  artist: string
  tourName: string
  city: string
  arenaName: string
  // Sale time in the fan's time zone, with venue time in brackets when it differs.
  saleTime: string
  // Waiting room opening time (30 minutes before the sale), fan's time zone.
  waitingRoomTime: string
  streak: number
  readiness: { loggedIn: boolean; plan: boolean | null; card: boolean }
  links: { hub: string; plan: string; card: string; waiting: string }
}

export interface Email {
  subject: string
  preheader: string
  html: string
  text: string
}

export const templateNames: Record<EmailTemplate, string> = {
  'day-7': '7 days before: tips',
  'day-1': '1 day before: final checklist',
  'hour-before': '1 hour before: waiting room opens soon',
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

interface Item {
  done: boolean | null
  title: string
  body: string
  link?: { label: string; href: string }
}

const SAFETY = 'We will never ask for card details by email. Your streak never changes your place in the queue.'

function render(ctx: EmailContext, subject: string, preheader: string, intro: string, items: Item[], cta: { label: string; href: string }, outro?: string): Email {
  const row = (i: Item) => `
      <tr>
        <td style="width:28px;vertical-align:top;padding:10px 0;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;font-size:12px;font-weight:700;${i.done ? 'background:#1F7A46;color:#ffffff;' : i.done === null ? 'background:#E6E0D5;color:#4A453C;' : 'border:2px solid #8A8173;color:#4A453C;line-height:16px;'}">${i.done ? '&#10003;' : i.done === null ? '&#8250;' : ''}</span>
        </td>
        <td style="padding:10px 0;font-size:15px;line-height:1.5;color:#1A1A1A;">
          <strong>${esc(i.title)}</strong> ${esc(i.body)}${i.done === false && i.link ? ` <a href="${esc(i.link.href)}" style="color:#1A1A1A;font-weight:600;">${esc(i.link.label)}</a>` : ''}
        </td>
      </tr>`

  const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#FAF8F5;padding:24px 12px;">
  <span style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E6E0D8;border-radius:12px;overflow:hidden;">
    <tr><td style="background:#111111;color:#ffffff;padding:14px 20px;font-weight:800;font-size:18px;">QuickSeat</td></tr>
    <tr><td style="padding:20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#5F5A54;">${esc(ctx.artist)} · ${esc(ctx.tourName)} · ${esc(ctx.city)}</p>
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#1A1A1A;">${esc(subject)}</h1>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#1A1A1A;">${esc(intro)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(row).join('')}
      </table>
      ${outro ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#1A1A1A;">${esc(outro)}</p>` : ''}
      <p style="text-align:center;margin:20px 0;"><a href="${esc(cta.href)}" style="display:inline-block;background:#111111;color:#ffffff;border-radius:999px;padding:12px 22px;font-weight:700;text-decoration:none;">${esc(cta.label)}</a></p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#5F5A54;">${SAFETY}</p>
    </td></tr>
  </table>
</div>`

  const text = [
    subject,
    '',
    intro,
    '',
    ...items.map((i) => `${i.done === null ? '-' : `[${i.done ? 'x' : ' '}]`} ${i.title} ${i.body}${i.done === false && i.link ? ` ${i.link.label}: ${i.link.href}` : ''}`),
    ...(outro ? ['', outro] : []),
    '',
    `${cta.label}: ${cta.href}`,
    '',
    SAFETY,
  ].join('\n')

  return { subject, preheader, html, text }
}

const streakLine = (ctx: EmailContext) =>
  ctx.streak > 0 ? `Hi ${ctx.name}, your ${ctx.streak}-day streak is looking good.` : `Hi ${ctx.name}, there's still time to start a streak with today's question.`

export function buildEmail(template: EmailTemplate, ctx: EmailContext): Email {
  const loggedIn: Item = { done: ctx.readiness.loggedIn, title: 'Stay logged in.', body: 'Sign in on the device you\'ll use for the sale and stay signed in.', link: { label: 'Log in', href: ctx.links.hub } }
  const card: Item = { done: ctx.readiness.card, title: 'Save your card.', body: 'Add it in the QuickSeat app so checkout takes seconds.', link: { label: 'Add it in the app', href: ctx.links.card } }
  const time: Item = { done: null, title: 'Know your time.', body: `Sale opens ${ctx.saleTime}.` }
  const plan: Item[] = ctx.readiness.plan === null ? [] : [{ done: ctx.readiness.plan, title: 'Set your ticket plan.', body: 'Choose seats together, your budget and up to three sections.', link: { label: 'Set my plan', href: ctx.links.plan } }]

  if (template === 'day-7') {
    return render(ctx, `7 days to go: three things to do before ${ctx.artist} ${ctx.city}`, 'Stay logged in, save your card and know your local sale time.',
      `${streakLine(ctx)} Before the sale, take a minute for these:`, [loggedIn, card, time], { label: 'Check my readiness', href: ctx.links.hub })
  }
  if (template === 'day-1') {
    return render(ctx, `Tomorrow: your final checklist for ${ctx.artist} ${ctx.city}`, 'One last check, and a tip for the queue.',
      `${streakLine(ctx)} Here's your final checklist:`, [loggedIn, ...plan, card, time], { label: 'Open my pre-sale hub', href: ctx.links.hub },
      'Once you\'re in the queue, don\'t refresh. Your place is kept, and we\'ll alert you if your plan changes.')
  }
  return render(ctx, `The waiting room opens soon: ${ctx.artist} ${ctx.city}`, `Doors open at ${ctx.waitingRoomTime}. No need to rush.`,
    `The waiting room opens at ${ctx.waitingRoomTime}, 30 minutes before the sale. Everyone in it gets a random place, so arriving early doesn't change anything.`,
    [loggedIn, ...plan, card], { label: 'Go to the waiting room', href: ctx.links.waiting })
}
