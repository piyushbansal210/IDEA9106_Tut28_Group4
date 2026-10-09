// Opt-in audio: a generated "waiting room loop" per artist, optional local clips, ducking and the alert chime.
// Nothing here ever starts playing on its own: play() is only called from a user's click.
import { useEffect, useSyncExternalStore } from 'react'
import type { ArtistId } from './types'
import { readStored, writeStored } from './storage'

interface MusicState {
  artistId: ArtistId | null
  focusMode: boolean
  playing: boolean
  pausedForFocus: boolean
  volume: number
  expanded: boolean
  minimized: boolean
  spotifyOpen: boolean
  trackIndex: number
  clipTitle: string | null
}

interface Prefs {
  sound: boolean
  notify: boolean
  minimized: boolean
  tipSeen: boolean
}

const PREFS_KEY = 'quickseat:audio-prefs'
let prefs: Prefs = readStored(PREFS_KEY, { sound: true, notify: false, minimized: false, tipSeen: false })

let state: MusicState = {
  artistId: null,
  focusMode: false,
  playing: false,
  pausedForFocus: false,
  volume: 0.4,
  expanded: false,
  minimized: prefs.minimized,
  spotifyOpen: false,
  trackIndex: 0,
  clipTitle: null,
}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const set = (patch: Partial<MusicState>) => {
  state = { ...state, ...patch }
  emit()
}

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch }
  writeStored(PREFS_KEY, prefs)
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useMusic = () => useSyncExternalStore(subscribe, () => state)
export const usePrefs = () => useSyncExternalStore(subscribe, () => prefs)

// ----- Generated loops -----
// Each artist gets a mood: chord roots (MIDI), tempo and timbre. These are original, generated tones,
// not recordings of the artists' songs.
const loops: Record<ArtistId, { title: string; bpm: number; chords: number[][]; wave: OscillatorType }[]> = {
  'taylor-swift': [
    { title: 'Waiting room loop: Golden hour', bpm: 84, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], wave: 'triangle' },
    { title: 'Waiting room loop: Midnight drive', bpm: 72, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], wave: 'sine' },
  ],
  bts: [
    { title: 'Waiting room loop: Neon Seoul', bpm: 100, chords: [[62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70], [57, 61, 64, 67]], wave: 'square' },
    { title: 'Waiting room loop: Purple sky', bpm: 78, chords: [[64, 67, 71], [60, 64, 67], [62, 65, 69], [59, 62, 66]], wave: 'triangle' },
  ],
  'charlie-puth': [
    { title: 'Waiting room loop: Piano room', bpm: 90, chords: [[65, 69, 72, 76], [62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 70]], wave: 'sine' },
    { title: 'Waiting room loop: Late show', bpm: 96, chords: [[57, 60, 64, 67], [62, 65, 69], [55, 59, 62, 65], [60, 64, 67]], wave: 'triangle' },
  ],
}

export const trackTitle = (artistId: ArtistId, i: number) => loops[artistId][i % loops[artistId].length].title

let ctx: AudioContext | null = null
let master: GainNode | null = null
let loopTimer: number | null = null
let clip: HTMLAudioElement | null = null
let duckTimer: number | null = null

function audio() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, master: master! }
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function note(midi: number, start: number, dur: number, gain: number, wave: OscillatorType) {
  const { ctx, master } = audio()
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = wave
  osc.frequency.value = freq(midi)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g).connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

function startLoop(artistId: ArtistId, index: number) {
  stopLoop()
  const loop = loops[artistId][index % loops[artistId].length]
  const beat = 60 / loop.bpm
  let step = 0
  const { ctx } = audio()
  let next = ctx.currentTime + 0.1
  const schedule = () => {
    while (next < ctx.currentTime + 0.6) {
      const chord = loop.chords[Math.floor(step / 8) % loop.chords.length]
      if (step % 8 === 0) chord.forEach((m) => note(m - 12, next, beat * 8, 0.05, 'sine'))
      const arp = chord[[0, 1, 2, 1, 3, 2, 1, 2][step % 8] % chord.length]
      note(arp + 12, next, beat * 0.9, 0.06, loop.wave)
      if (step % 4 === 0) note(chord[0] - 24, next, beat * 2, 0.08, 'sine')
      next += beat / 2
      step++
    }
  }
  schedule()
  loopTimer = window.setInterval(schedule, 200)
}

function stopLoop() {
  if (loopTimer) clearInterval(loopTimer)
  loopTimer = null
}

function fadeTo(value: number, seconds: number) {
  if (clip) {
    clip.volume = value
    return
  }
  const { ctx, master } = audio()
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
  master.gain.linearRampToValueAtTime(value, ctx.currentTime + seconds)
}

export function play() {
  if (!state.artistId) return
  stopClip()
  startLoop(state.artistId, state.trackIndex)
  fadeTo(state.volume, 1.5)
  set({ playing: true, pausedForFocus: false, expanded: true, spotifyOpen: false })
}

export function pause(forFocus = false) {
  if (!state.playing) return
  stopClip()
  if (ctx && master) {
    fadeTo(0, 0.3)
    window.setTimeout(stopLoop, 350)
  }
  set({ playing: false, pausedForFocus: forFocus })
}

export function nextTrack() {
  const i = state.trackIndex + 1
  set({ trackIndex: i })
  if (state.playing) play()
}

export function setVolume(v: number) {
  set({ volume: v })
  if (state.playing) fadeTo(v, 0.1)
}

// Play a local snippet (e.g. from the story timeline) through the record player.
export function playClip(url: string, title: string) {
  pause()
  stopClip()
  clip = new Audio(url)
  clip.volume = state.volume
  clip.onended = () => {
    clip = null
    set({ playing: false, clipTitle: null })
  }
  void clip.play().catch(() => set({ playing: false, clipTitle: null }))
  set({ playing: true, expanded: true, clipTitle: title })
}

function stopClip() {
  if (!clip) return
  clip.pause()
  clip = null
  state = { ...state, clipTitle: null }
}

export function openSpotify() {
  pause()
  set({ spotifyOpen: true, expanded: true, minimized: false })
}

export const setExpanded = (expanded: boolean) => set({ expanded })
export function setMinimized(minimized: boolean) {
  setPrefs({ minimized })
  set({ minimized, expanded: false })
}

// Briefly lowers the music so an alert chime is clearly heard.
export function duck() {
  if (!state.playing) return
  fadeTo(0.15 * state.volume, 0.2)
  if (duckTimer) clearTimeout(duckTimer)
  duckTimer = window.setTimeout(() => state.playing && fadeTo(state.volume, 0.6), 3000)
}

// Soft two-tone chime, generated so no audio file is needed.
export function chime() {
  if (!prefs.sound) return
  const { ctx } = audio()
  const t = ctx.currentTime
  ;[[784, 0], [1046.5, 0.18]].forEach(([f, d]) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = f
    g.gain.setValueAtTime(0, t + d)
    g.gain.linearRampToValueAtTime(0.18, t + d + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4)
    osc.connect(g).connect(ctx.destination)
    osc.start(t + d)
    osc.stop(t + d + 0.45)
  })
}

export function notify(title: string, body: string) {
  duck()
  chime()
  if (prefs.notify && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}

let clearTimer: number | null = null
let lastArtist: ArtistId | null = null

// Pages declare which artist the record player belongs to; 'focus' pauses it (your turn, checkout).
// Moving between two pages of the same artist keeps the music going.
export function useRecordPlayerHost(artistId: ArtistId | null, mode: 'show' | 'focus' = 'show') {
  useEffect(() => {
    if (clearTimer) clearTimeout(clearTimer)
    if (artistId !== lastArtist) {
      pause()
      set({ trackIndex: 0, spotifyOpen: false })
    }
    lastArtist = artistId
    if (mode === 'focus') {
      pause(true)
      set({ artistId, focusMode: true, expanded: false, spotifyOpen: false })
    } else {
      set({ artistId, focusMode: false, pausedForFocus: false })
    }
    return () => {
      clearTimer = window.setTimeout(() => {
        lastArtist = null
        pause()
        set({ artistId: null, focusMode: false, expanded: false, spotifyOpen: false })
      }, 0)
    }
  }, [artistId, mode])
}

export const getPrefs = () => prefs
