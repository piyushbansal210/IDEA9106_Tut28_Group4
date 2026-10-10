// Pure colour maths (no DOM), shared by the theme engine and the Node tests.

export interface Theme {
  id: string
  name: string
  swatch: string
}

// Black is the default; the rest is the Desert Chic palette.
export const themes: Theme[] = [
  { id: 'noir', name: 'Black', swatch: '#111111' },
  { id: 'orange-rust', name: 'Orange Rust', swatch: '#C25A3C' },
  { id: 'honey-ginger', name: 'Honey Ginger', swatch: '#A86217' },
  { id: 'sand', name: 'Sand', swatch: '#CDB48C' },
  { id: 'earth-red', name: 'Earth Red', swatch: '#95424E' },
  { id: 'sandstone', name: 'Sandstone', swatch: '#C48A69' },
]

const WHITE = '#FFFFFF'
const INK = '#1A1A1A'
const MIN_CONTRAST = 4.5

export const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase()

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function rgbToHsl([r, g, b]: number[]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

function hslToRgb([h, s, l]: number[]) {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => v * 255)
}

// Picks white or ink text automatically; if neither reaches AA, darkens the colour until white does.
export function themeTokens(swatch: string) {
  let bg = swatch.toUpperCase()
  let fg = contrast(bg, WHITE) >= contrast(bg, INK) ? WHITE : INK
  if (contrast(bg, fg) < MIN_CONTRAST) {
    const hsl = rgbToHsl(hexToRgb(bg))
    while (contrast(bg, WHITE) < MIN_CONTRAST && hsl[2] > 0) {
      hsl[2] = Math.max(0, hsl[2] - 0.03)
      bg = rgbToHex(hslToRgb(hsl))
    }
    fg = WHITE
  }
  const [r, g, b] = hexToRgb(bg)
  return {
    '--nav-bg': bg,
    '--nav-fg': fg,
    '--accent': bg,
    '--accent-fg': fg,
    '--accent-soft': `rgba(${r}, ${g}, ${b}, 0.12)`,
    '--accent-mid': `rgba(${r}, ${g}, ${b}, 0.35)`,
    '--focus': bg,
  }
}

// Presale streak colours. Semantic, fixed across themes (mirrored as --streak-* in index.css).
// "Tried" is a light, saturated amber so it stays distinct from the brand oranges (Orange Rust, Honey Ginger)
// by lightness and from Sand/Sandstone by saturation; every cell also carries an icon and a label.
export const STREAK_COLOURS = {
  correct: { fill: '#1F7A46', icon: '#FFFFFF', border: '#1F7A46' },
  tried: { fill: '#E8A33D', icon: '#1A1A1A', border: '#9A5B0B' },
  missed: { fill: '#E6E0D5', icon: '#4A453C', border: '#8A8173' },
} as const

export const saturation = (hex: string) => rgbToHsl(hexToRgb(hex))[1]
