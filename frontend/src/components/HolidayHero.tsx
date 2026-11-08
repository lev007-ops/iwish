import { useEffect, useState } from 'react'
import { celebrate } from '../lib/confetti'
import { remaining, type Remaining } from '../lib/countdown'
import { formatLongDate, formatWeekday, parseLocalDate, plural } from '../lib/format'
import type { PublicHoliday } from '../lib/types'

const UNITS: { key: keyof Remaining; forms: [string, string, string] }[] = [
  { key: 'months', forms: ['месяц', 'месяца', 'месяцев'] },
  { key: 'days', forms: ['день', 'дня', 'дней'] },
  { key: 'hours', forms: ['час', 'часа', 'часов'] },
  { key: 'minutes', forms: ['минута', 'минуты', 'минут'] },
  { key: 'seconds', forms: ['секунда', 'секунды', 'секунд'] },
]

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // Align ticks to whole seconds so the counter changes in step with the clock.
    let timer: number
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    }
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5)
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

export function HolidayHero({ holiday, onDayChange }: { holiday: PublicHoliday; onDayChange: () => void }) {
  const now = useNow()
  const target = parseLocalDate(holiday.date)
  const left = remaining(now, target)
  const isToday = left === null

  // Once the date rolls over (local midnight), ask the server for the right holiday again.
  const [startDay] = useState(() => now.toDateString())
  useEffect(() => {
    if (now.toDateString() !== startDay) onDayChange()
  }, [now, startDay, onDayChange])

  useEffect(() => {
    if (!isToday) return
    const t1 = window.setTimeout(() => celebrate(holiday.theme, true), 400)
    const t2 = window.setInterval(() => celebrate(holiday.theme, false), 9000)
    const stop = window.setTimeout(() => window.clearInterval(t2), 60000)
    return () => {
      window.clearTimeout(t1)
      window.clearInterval(t2)
      window.clearTimeout(stop)
    }
  }, [isToday, holiday.theme])

  // Hide leading zero months/days ("0 месяцев"), always keep hours/minutes/seconds.
  const visibleUnits = left
    ? UNITS.filter(
        (u) =>
          (u.key === 'months' && left.months > 0) ||
          (u.key === 'days' && (left.months > 0 || left.days > 0)) ||
          (u.key !== 'months' && u.key !== 'days'),
      )
    : []

  return (
    <section className="glass relative overflow-hidden rounded-4xl border border-line px-5 py-8 text-center shadow-xl shadow-black/5 sm:px-10 sm:py-10">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--c-accent) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative">
        <button
          type="button"
          className="mx-auto block text-6xl leading-none transition-transform hover:scale-110 active:scale-95 sm:text-7xl"
          onClick={() => celebrate(holiday.theme, isToday)}
          aria-label="Конфетти!"
          title="Нажми меня"
        >
          {holiday.emoji}
        </button>
        <h1 className="font-display mt-4 text-3xl leading-tight font-bold text-balance sm:text-5xl">
          {holiday.name}
        </h1>
        <p className="mt-2 text-sm font-medium text-muted sm:text-base">
          {formatLongDate(holiday.date)} · {formatWeekday(holiday.date)}
        </p>

        {isToday ? (
          <p className="font-display mt-7 text-2xl font-bold text-accent sm:text-4xl">
            Сегодня праздник! 🎉
          </p>
        ) : (
          <div
            className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-3"
            role="timer"
            aria-label="До праздника осталось"
          >
            {visibleUnits.map((u) => (
              <div
                key={u.key}
                className="flex min-w-17 flex-col items-center rounded-2xl bg-accent-soft px-2 py-3 sm:min-w-22 sm:px-4"
              >
                <span className="text-3xl font-extrabold text-accent tabular-nums sm:text-5xl">
                  {u.key === 'months' || u.key === 'days'
                    ? left![u.key]
                    : String(left![u.key]).padStart(2, '0')}
                </span>
                <span className="mt-1 text-[0.7rem] font-semibold tracking-wide text-muted uppercase sm:text-xs">
                  {plural(left![u.key], u.forms)}
                </span>
              </div>
            ))}
          </div>
        )}

        {holiday.description && (
          <p className="mx-auto mt-6 max-w-xl text-base whitespace-pre-line text-ink/85">
            {holiday.description}
          </p>
        )}
      </div>
    </section>
  )
}
