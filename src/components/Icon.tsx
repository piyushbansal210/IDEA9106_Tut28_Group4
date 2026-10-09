// Small inline icon set (stroke icons, 24×24) so no icon library is needed.
const paths = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 9.8C22 6 17.5 3 12 3Z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.5" /></>,
  ticket: <><path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-1a2 2 0 0 1 0-4 2 2 0 0 0 0-4V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z" /><path d="M14 6v12" strokeDasharray="2 2" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="m15 5-7 7 7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  up: <path d="m5 15 7-7 7 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  volume: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4Z" /><path d="m16 10 4 4M20 10l-4 4" /></>,
  play: <path d="M7 5.5v13l11-6.5Z" fill="currentColor" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none" />,
  next: <><path d="M5 6v12l9-6Z" fill="currentColor" /><path d="M18 6v12" /></>,
  minimize: <path d="M5 12h14" />,
  music: <><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  arrowRight: <path d="M5 12h14m-5-5 5 5-5 5" />,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  shield: <><path d="M12 3 5 6v5.5c0 4.4 3 8.2 7 9.5 4-1.3 7-5.1 7-9.5V6Z" /><path d="m9 12 2 2 4-4" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a12.5 12.5 0 0 1-2.9 3.6M6.6 7.6A12.7 12.7 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9.3 9.3 0 0 0 4.4-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  share: <><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" /></>,
  standing: <path d="M5 19 9 9l3 5 3-8 4 13" />,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  minusCircle: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
} as const

export type IconName = keyof typeof paths

export default function Icon({ name, size, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  )
}
