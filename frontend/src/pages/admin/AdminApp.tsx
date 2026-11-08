import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { LogoutIcon, EyeIcon } from '../../components/icons'
import { ThemeToggle } from '../../components/ThemeToggle'
import { ApiError, adminApi } from '../../lib/api'
import type { AdminGift, AdminHoliday, Guest } from '../../lib/types'
import { GiftsTab } from './GiftsTab'
import { GuestsTab } from './GuestsTab'
import { HolidaysTab } from './HolidaysTab'
import { Login } from './Login'

export interface AdminData {
  holidays: AdminHoliday[]
  gifts: AdminGift[]
  guests: Guest[]
  reload: () => Promise<void>
}

const TABS = [
  { to: '/admin/gifts', label: 'Подарки', icon: '🎁' },
  { to: '/admin/holidays', label: 'Праздники', icon: '🎉' },
  { to: '/admin/links', label: 'Ссылки и QR', icon: '🔗' },
]

export function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [data, setData] = useState<Omit<AdminData, 'reload'> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [holidays, gifts, guests] = await Promise.all([
        adminApi.holidays(),
        adminApi.gifts(),
        adminApi.guests(),
      ])
      setData({ holidays, gifts, guests })
      setAuthed(true)
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuthed(false)
      else setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    document.title = 'Админка — iWish'
    void reload()
  }, [reload])

  const logout = async () => {
    await adminApi.logout().catch(() => {})
    setData(null)
    setAuthed(false)
  }

  if (authed === false) return <Login onSuccess={reload} />

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 sm:px-6">
          <span className="font-display mr-auto text-lg font-bold">
            i<span className="text-accent">Wish</span>
            <span className="ml-2 text-xs font-semibold tracking-wide text-muted uppercase">admin</span>
          </span>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            title="Открыть публичную страницу"
            aria-label="Открыть публичную страницу"
          >
            <EyeIcon size={18} />
          </a>
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogoutIcon size={18} />
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  isActive ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
        {error && (
          <p className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {!data ? (
          <div className="space-y-3" aria-busy>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass h-20 animate-pulse rounded-3xl border border-line" />
            ))}
          </div>
        ) : (
          <Routes>
            <Route index element={<Navigate to="/admin/gifts" replace />} />
            <Route path="gifts" element={<GiftsTab {...data} reload={reload} />} />
            <Route path="holidays" element={<HolidaysTab {...data} reload={reload} />} />
            <Route path="links" element={<GuestsTab {...data} reload={reload} />} />
            <Route path="*" element={<Navigate to="/admin/gifts" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
