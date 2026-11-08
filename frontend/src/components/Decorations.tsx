import { useMemo, type CSSProperties } from 'react'
import { HOLIDAY_THEMES } from '../lib/holidayThemes'
import type { Theme } from '../lib/types'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Page-wide floating decorations (snow, balloons, hearts…) for a holiday theme. */
export function Decorations({ theme }: { theme: Theme }) {
  const meta = HOLIDAY_THEMES[theme]
  const items = useMemo(() => {
    if (!meta.particles.length) return []
    const rnd = seeded(theme.length * 7919 + 17)
    const count = meta.motion === 'fall' ? 26 : 12
    return Array.from({ length: count }, (_, i) => {
      const size = meta.motion === 'fall' ? 10 + rnd() * 16 : 22 + rnd() * 20
      const duration = meta.motion === 'fall' ? 12 + rnd() * 16 : 18 + rnd() * 16
      return {
        key: i,
        char: meta.particles[i % meta.particles.length],
        style: {
          left: `${rnd() * 100}%`,
          fontSize: `${size}px`,
          opacity: 0.35 + rnd() * 0.45,
          animationDuration: `${duration}s`,
          animationDelay: `${-rnd() * duration}s`,
          '--drift': `${(rnd() - 0.5) * 120}px`,
          '--spin': `${(rnd() - 0.5) * 540}deg`,
          color: 'var(--c-accent)',
        } as CSSProperties,
      }
    })
  }, [theme, meta])

  if (!items.length) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {items.map((it) => (
        <span
          key={it.key}
          className={`deco ${meta.motion === 'fall' ? 'deco-fall' : 'deco-rise'} ${theme === 'new_year' ? 'text-sky-300 dark:text-white' : ''}`}
          style={theme === 'new_year' ? { ...it.style, color: undefined } : it.style}
        >
          {it.char}
        </span>
      ))}
    </div>
  )
}
