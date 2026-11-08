import { useCallback, useEffect, useState } from 'react'
import { Decorations } from '../components/Decorations'
import { GiftItem } from '../components/GiftItem'
import { HolidayHero } from '../components/HolidayHero'
import { ThemeToggle } from '../components/ThemeToggle'
import { localDateString, publicApi } from '../lib/api'
import { plural } from '../lib/format'
import type { PublicGift, PublicState } from '../lib/types'

/** Liked first, then by desire (the server-provided rank). */
function sortGifts(gifts: PublicGift[]) {
  return [...gifts].sort((a, b) => Number(b.liked) - Number(a.liked) || a.rank - b.rank)
}

export function PublicPage() {
  const [state, setState] = useState<PublicState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const load = useCallback(async () => {
    try {
      const s = await publicApi.state(localDateString())
      setState(s)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Theme the whole page after the holiday.
  const theme = state?.holiday?.theme ?? 'none'
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'none') delete root.dataset.holiday
    else root.dataset.holiday = theme
    return () => {
      delete root.dataset.holiday
    }
  }, [theme])

  useEffect(() => {
    document.title = state?.holiday ? `${state.holiday.emoji} ${state.holiday.name} — iWish` : 'iWish — список желаний'
  }, [state?.holiday])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(t)
  }, [toast])

  const patch = (id: number, changes: Partial<PublicGift>) =>
    setState((s) =>
      s ? { ...s, gifts: sortGifts(s.gifts.map((g) => (g.id === id ? { ...g, ...changes } : g))) } : s,
    )

  const onLike = async (g: PublicGift) => {
    patch(g.id, { liked: !g.liked })
    try {
      await publicApi.like(g.id, !g.liked)
    } catch (e) {
      patch(g.id, { liked: g.liked })
      setToast((e as Error).message)
    }
  }

  const onReserve = async (g: PublicGift) => {
    const on = g.reservation === 'none'
    setBusy(g.id)
    try {
      await publicApi.reserve(g.id, on)
      patch(g.id, { reservation: on ? 'mine' : 'none' })
      setToast(on ? 'Отлично! Подарок отмечен за вами 🎁' : 'Отметка снята')
    } catch (e) {
      setToast((e as Error).message)
      void load()
    } finally {
      setBusy(null)
    }
  }

  const gifts = state?.gifts ?? []
  const likedCount = gifts.filter((g) => g.liked).length

  return (
    <div className="relative min-h-dvh">
      <Decorations theme={theme} />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 sm:px-6">
        <header className="flex items-center justify-between py-3">
          <span className="font-display text-lg font-bold tracking-tight">
            i<span className="text-accent">Wish</span>
          </span>
          <ThemeToggle />
        </header>

        {state?.guest_name && (
          <p className="mt-2 mb-5 text-center text-lg sm:text-xl">
            Привет, <span className="font-bold text-accent">{state.guest_name}</span>! 👋
            <span className="mt-1 block text-sm text-muted">Здесь мой список желаний — выбирай, что нравится</span>
          </p>
        )}

        {error && !state && (
          <div className="glass mt-10 rounded-3xl border border-line p-8 text-center">
            <p className="text-lg font-semibold">Не удалось загрузить страницу</p>
            <p className="mt-1 text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-ink"
            >
              Повторить
            </button>
          </div>
        )}

        {!state && !error && (
          <div className="mt-4 space-y-4" aria-busy>
            <div className="glass h-72 animate-pulse rounded-4xl border border-line" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-20 animate-pulse rounded-3xl border border-line" />
            ))}
          </div>
        )}

        {state && (
          <>
            {state.holiday ? (
              <HolidayHero key={state.holiday.id + state.holiday.date} holiday={state.holiday} onDayChange={load} />
            ) : (
              <section className="glass rounded-4xl border border-line px-6 py-10 text-center">
                <div className="text-6xl">🎁</div>
                <h1 className="font-display mt-4 text-3xl font-bold">Мой список желаний</h1>
                <p className="mt-2 text-muted">Ближайших праздников пока нет — но идеи подарков всегда тут.</p>
              </section>
            )}

            <section className="mt-8" aria-labelledby="gifts-title">
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 id="gifts-title" className="text-xl font-bold">
                  Список желаний
                </h2>
                <span className="text-sm text-muted">
                  {gifts.length} {plural(gifts.length, ['подарок', 'подарка', 'подарков'])}
                  {likedCount > 0 && ` · ♥ ${likedCount}`}
                </span>
              </div>
              {gifts.length === 0 ? (
                <p className="glass rounded-3xl border border-line p-6 text-center text-muted">
                  Список пока пуст — загляните чуть позже ✨
                </p>
              ) : (
                <ul className="space-y-3">
                  {gifts.map((g) => (
                    <GiftItem key={g.id} gift={g} onLike={onLike} onReserve={onReserve} busy={busy === g.id} />
                  ))}
                </ul>
              )}
              {gifts.length > 1 && (
                <p className="mt-4 px-1 text-center text-xs text-muted">
                  Нажмите ♥, чтобы поднять подарок наверх. Лайки видны только вам.
                </p>
              )}
            </section>
          </>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="animate-sheet fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-center text-sm font-medium text-bg shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
