import type { GiftBase } from './types'

export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'RUB', symbol: '₽', label: 'Рубль ₽' },
  { code: 'USD', symbol: '$', label: 'Доллар $' },
  { code: 'EUR', symbol: '€', label: 'Евро €' },
  { code: 'GBP', symbol: '£', label: 'Фунт £' },
  { code: 'CNY', symbol: '¥', label: 'Юань ¥' },
  { code: 'KZT', symbol: '₸', label: 'Тенге ₸' },
  { code: 'BYN', symbol: 'Br', label: 'Бел. рубль Br' },
  { code: 'UAH', symbol: '₴', label: 'Гривна ₴' },
  { code: 'TRY', symbol: '₺', label: 'Лира ₺' },
  { code: 'AED', symbol: 'AED', label: 'Дирхам AED' },
]

const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export function formatPrice(g: Pick<GiftBase, 'price_min' | 'price_max' | 'price_approx' | 'currency'>) {
  if (g.price_min == null) return null
  const symbol = g.currency
    ? (CURRENCIES.find((c) => c.code === g.currency)?.symbol ?? g.currency)
    : ''
  const range =
    g.price_max != null ? `${num.format(g.price_min)} – ${num.format(g.price_max)}` : num.format(g.price_min)
  return `${g.price_approx ? '~ ' : ''}${range}${symbol ? ` ${symbol}` : ''}`
}

export function plural(n: number, forms: [string, string, string]) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return forms[0]
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1]
  return forms[2]
}

/** Parse YYYY-MM-DD as a local date (midnight in the device timezone). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** dd.mm.yyyy — the format used in date inputs. Accepts YYYY-MM-DD or a Date. */
export function formatDate(v: string | Date) {
  const d = typeof v === 'string' ? parseLocalDate(v) : v
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** "1 января 2027" — how dates are shown to people. Accepts YYYY-MM-DD or a Date. */
export function formatLongDate(v: string | Date) {
  const d = typeof v === 'string' ? parseLocalDate(v) : v
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "1 января 2027, 14:05" in the device timezone. */
export function formatLongDateTime(d: Date) {
  return `${formatLongDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Parse dd.mm.yyyy into YYYY-MM-DD; null if incomplete or not a real date. */
export function parseRuDate(s: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

export function formatWeekday(s: string) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(parseLocalDate(s))
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
