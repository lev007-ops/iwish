export interface Remaining {
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

function addMonthsClamped(d: Date, months: number): Date {
  const r = new Date(d)
  const day = r.getDate()
  r.setDate(1)
  r.setMonth(r.getMonth() + months)
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()
  r.setDate(Math.min(day, last))
  return r
}

/** Calendar-aware time left from `now` to `target` (both local). Null when reached. */
export function remaining(now: Date, target: Date): Remaining | null {
  if (now >= target) return null

  let months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  let anchor = addMonthsClamped(now, months)
  while (months > 0 && anchor > target) {
    months -= 1
    anchor = addMonthsClamped(now, months)
  }

  let days = 0
  for (;;) {
    const next = new Date(anchor)
    next.setDate(next.getDate() + 1)
    if (next > target) break
    anchor = next
    days += 1
  }

  let rest = Math.floor((target.getTime() - anchor.getTime()) / 1000)
  const hours = Math.floor(rest / 3600)
  rest -= hours * 3600
  const minutes = Math.floor(rest / 60)
  const seconds = rest - minutes * 60
  return { months, days, hours, minutes, seconds }
}
