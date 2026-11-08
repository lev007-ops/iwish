import confetti from 'canvas-confetti'
import { HOLIDAY_THEMES } from './holidayThemes'
import type { Theme } from './types'

type Shape = confetti.Shape

const shapeCache = new Map<string, Shape>()
function emojiShape(text: string): Shape {
  let s = shapeCache.get(text)
  if (!s) {
    s = confetti.shapeFromText({ text, scalar: 2 })
    shapeCache.set(text, s)
  }
  return s
}

/** A celebratory burst from both sides of the screen, in the holiday's colours. */
export function celebrate(theme: Theme, big = true) {
  const meta = HOLIDAY_THEMES[theme]
  const base: confetti.Options = {
    colors: meta.confetti,
    disableForReducedMotion: true,
    zIndex: 60,
  }
  const count = big ? 90 : 45
  for (const x of [0.1, 0.9]) {
    confetti({
      ...base,
      particleCount: count,
      spread: 70,
      startVelocity: big ? 55 : 40,
      angle: x < 0.5 ? 60 : 120,
      origin: { x, y: 0.75 },
    })
  }
  if (meta.confettiEmoji.length) {
    confetti({
      ...base,
      particleCount: big ? 24 : 12,
      spread: 120,
      startVelocity: 35,
      scalar: 2,
      flat: true,
      shapes: meta.confettiEmoji.map(emojiShape),
      origin: { x: 0.5, y: 0.35 },
    })
  }
}
