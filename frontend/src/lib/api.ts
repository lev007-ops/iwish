import type {
  AdminGift,
  AdminHoliday,
  GiftInput,
  Guest,
  HolidayInput,
  PublicState,
  UploadResult,
} from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const FIELD_NAMES: Record<string, string> = {
  name: 'название',
  emoji: 'эмодзи',
  date: 'дата',
  link: 'ссылка',
  photo_url: 'ссылка на фото',
  price_min: 'цена',
  price_max: 'цена',
  desire: 'степень желания',
  currency: 'валюта',
}

function describe(detail: unknown, status: number): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const fields = detail
      .map((d) => (Array.isArray(d?.loc) ? String(d.loc[d.loc.length - 1]) : ''))
      .map((f) => FIELD_NAMES[f] ?? f)
      .filter(Boolean)
    if (fields.length) return `Проверьте поле: ${[...new Set(fields)].join(', ')}`
  }
  return status >= 500 ? 'Ошибка сервера, попробуйте ещё раз' : `Ошибка ${status}`
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, credentials: 'same-origin', headers: {} }
  if (body instanceof FormData) {
    init.body = body
  } else if (body !== undefined) {
    init.body = JSON.stringify(body)
    ;(init.headers as Record<string, string>)['Content-Type'] = 'application/json'
  }
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError(0, 'Нет соединения с сервером')
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, describe(data?.detail, res.status))
  return data as T
}

export function localDateString(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const publicApi = {
  state: (today: string) =>
    request<PublicState>('GET', `/api/public/state?today=${encodeURIComponent(today)}`),
  like: (id: number, on: boolean) =>
    request<void>(on ? 'PUT' : 'DELETE', `/api/public/gifts/${id}/like`),
  reserve: (id: number, on: boolean) =>
    request<void>(on ? 'PUT' : 'DELETE', `/api/public/gifts/${id}/reservation`),
}

export const adminApi = {
  me: () => request<{ ok: boolean }>('GET', '/api/admin/me'),
  login: (password: string) => request<void>('POST', '/api/admin/login', { password }),
  logout: () => request<void>('POST', '/api/admin/logout'),

  holidays: () => request<AdminHoliday[]>('GET', '/api/admin/holidays'),
  createHoliday: (b: HolidayInput) => request<AdminHoliday>('POST', '/api/admin/holidays', b),
  updateHoliday: (id: number, b: HolidayInput) =>
    request<AdminHoliday>('PUT', `/api/admin/holidays/${id}`, b),
  deleteHoliday: (id: number) => request<void>('DELETE', `/api/admin/holidays/${id}`),

  gifts: () => request<AdminGift[]>('GET', '/api/admin/gifts'),
  createGift: (b: GiftInput) => request<AdminGift>('POST', '/api/admin/gifts', b),
  updateGift: (id: number, b: GiftInput) => request<AdminGift>('PUT', `/api/admin/gifts/${id}`, b),
  deleteGift: (id: number) => request<void>('DELETE', `/api/admin/gifts/${id}`),
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request<UploadResult>('POST', '/api/admin/uploads', fd)
  },

  guests: () => request<Guest[]>('GET', '/api/admin/guests'),
  createGuest: (name: string) => request<Guest>('POST', '/api/admin/guests', { name }),
  updateGuest: (id: string, name: string) =>
    request<Guest>('PUT', `/api/admin/guests/${id}`, { name }),
  deleteGuest: (id: string) => request<void>('DELETE', `/api/admin/guests/${id}`),
}
