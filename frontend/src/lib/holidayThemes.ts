import type { Theme } from './types'

export interface HolidayThemeMeta {
  label: string
  icon: string
  /** Decorations floating over the page. */
  particles: string[]
  motion: 'fall' | 'rise'
  /** Confetti colours on the holiday day. */
  confetti: string[]
  /** Emoji shapes mixed into the confetti. */
  confettiEmoji: string[]
  /** Swatch for the admin picker. */
  swatch: [string, string]
}

export const HOLIDAY_THEMES: Record<Theme, HolidayThemeMeta> = {
  none: {
    label: 'Без оформления',
    icon: '✨',
    particles: [],
    motion: 'fall',
    confetti: ['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
    confettiEmoji: [],
    swatch: ['#7c3aed', '#ec4899'],
  },
  new_year: {
    label: 'Новый год',
    icon: '🎄',
    particles: ['❄', '❅', '❆', '•'],
    motion: 'fall',
    confetti: ['#c8102e', '#f5c451', '#1f7a4d', '#ffffff', '#7dd3fc'],
    confettiEmoji: ['❄️', '⭐'],
    swatch: ['#0f2648', '#c8102e'],
  },
  birthday: {
    label: 'День рождения',
    icon: '🎂',
    particles: ['🎈', '🎈', '🎈', '🎁', '🎉'],
    motion: 'rise',
    confetti: ['#e11d74', '#f59e0b', '#22d3ee', '#a3e635', '#a78bfa'],
    confettiEmoji: ['🎈', '🎉'],
    swatch: ['#e11d74', '#f59e0b'],
  },
  valentine: {
    label: 'День влюблённых',
    icon: '💘',
    particles: ['❤', '♥', '💕', '❤'],
    motion: 'rise',
    confetti: ['#e11d48', '#fb7185', '#fda4af', '#ffffff', '#be185d'],
    confettiEmoji: ['❤️', '💕'],
    swatch: ['#e11d48', '#fda4af'],
  },
  feb23: {
    label: '23 февраля',
    icon: '🎖️',
    particles: ['★', '☆', '★'],
    motion: 'fall',
    confetti: ['#4d6b1a', '#b91c1c', '#f5c451', '#d6d3c4'],
    confettiEmoji: ['⭐'],
    swatch: ['#4d6b1a', '#b91c1c'],
  },
  march8: {
    label: '8 марта',
    icon: '🌷',
    particles: ['🌷', '🌼', '🌸', '🌼'],
    motion: 'fall',
    confetti: ['#db2777', '#fde047', '#65a30d', '#f9a8d4', '#ffffff'],
    confettiEmoji: ['🌷', '🌼'],
    swatch: ['#fde047', '#db2777'],
  },
  halloween: {
    label: 'Хэллоуин',
    icon: '🎃',
    particles: ['🦇', '🎃', '🦇', '👻'],
    motion: 'rise',
    confetti: ['#ea580c', '#7c3aed', '#111827', '#a3e635'],
    confettiEmoji: ['🎃', '🦇'],
    swatch: ['#ea580c', '#2b1050'],
  },
  anniversary: {
    label: 'Годовщина / свадьба',
    icon: '💍',
    particles: ['✨', '✦', '✧', '✨'],
    motion: 'fall',
    confetti: ['#e3c26f', '#ffffff', '#f0a3b4', '#9a7425'],
    confettiEmoji: ['💍', '✨'],
    swatch: ['#9a7425', '#f0a3b4'],
  },
}

export const THEME_KEYS = Object.keys(HOLIDAY_THEMES) as Theme[]
