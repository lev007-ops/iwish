export type Theme =
  | 'none'
  | 'new_year'
  | 'birthday'
  | 'valentine'
  | 'feb23'
  | 'march8'
  | 'halloween'
  | 'anniversary'

export interface GiftBase {
  id: number
  name: string
  description: string | null
  price_min: number | null
  price_max: number | null
  price_approx: boolean
  currency: string | null
  photo: string | null
  thumb: string | null
  link: string | null
}

export interface PublicGift extends GiftBase {
  liked: boolean
  reservation: 'none' | 'mine' | 'other'
  rank: number
}

export interface PublicHoliday {
  id: number
  name: string
  emoji: string
  description: string | null
  theme: Theme
  date: string // YYYY-MM-DD, the upcoming occurrence
}

export interface PublicState {
  guest_name: string | null
  holiday: PublicHoliday | null
  gifts: PublicGift[]
}

export interface AdminHoliday {
  id: number
  name: string
  emoji: string
  date: string
  description: string | null
  repeats_yearly: boolean
  theme: Theme
  next_date: string | null
  gift_count: number
}

export type HolidayInput = Omit<AdminHoliday, 'id' | 'next_date' | 'gift_count'>

export interface AdminGift extends GiftBase {
  desire: number
  archived: boolean
  photo_file: string | null
  photo_url: string | null
  holiday_ids: number[]
  like_count: number
}

export interface GiftInput {
  name: string
  description: string | null
  price_min: number | null
  price_max: number | null
  price_approx: boolean
  currency: string | null
  photo_file: string | null
  photo_url: string | null
  link: string | null
  desire: number
  archived: boolean
  holiday_ids: number[]
}

export interface Guest {
  id: string
  name: string
  created_at: string
  device_count: number
  last_seen_at: string | null
}

export interface UploadResult {
  photo_file: string
  photo: string
  thumb: string
}
