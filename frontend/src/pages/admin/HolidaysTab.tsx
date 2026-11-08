import { useState, type FormEvent } from 'react'
import { PencilIcon, PlusIcon, TrashIcon } from '../../components/icons'
import { Modal } from '../../components/Modal'
import { Button, DateInput, Empty, ErrorText, Field, IconButton, Input, Textarea, Toggle } from '../../components/ui'
import { useConfirm } from '../../components/useConfirm'
import { adminApi } from '../../lib/api'
import { formatLongDate, plural } from '../../lib/format'
import { HOLIDAY_THEMES, THEME_KEYS } from '../../lib/holidayThemes'
import type { AdminHoliday, HolidayInput } from '../../lib/types'
import type { AdminData } from './AdminApp'

const EMOJI_PICKS = ['🎂', '🎄', '🎅', '🎉', '🎁', '💘', '🌷', '🎖️', '🎃', '💍', '🥂', '🎓', '👶', '🏠', '✈️', '⭐']

function blank(): HolidayInput {
  return { name: '', emoji: '🎉', date: '', description: null, repeats_yearly: false, theme: 'none' }
}

function HolidayForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: AdminHoliday | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<HolidayInput>(() =>
    initial
      ? {
          name: initial.name,
          emoji: initial.emoji,
          date: initial.date,
          description: initial.description,
          repeats_yearly: initial.repeats_yearly,
          theme: initial.theme,
        }
      : blank(),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof HolidayInput>(k: K, v: HolidayInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (initial) await adminApi.updateHoliday(initial.id, form)
      else await adminApi.createHoliday(form)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={initial ? 'Редактировать праздник' : 'Новый праздник'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !form.name.trim() || !form.date}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="Эмодзи">
            <Input
              value={form.emoji}
              onChange={(e) => set('emoji', e.target.value)}
              className="text-center text-2xl!"
              maxLength={16}
              required
            />
          </Field>
          <Field label="Название">
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Мой день рождения"
              required
              autoFocus
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1">
          {EMOJI_PICKS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => set('emoji', em)}
              className={`size-9 rounded-lg text-xl transition hover:bg-surface-2 ${form.emoji === em ? 'bg-accent-soft ring-2 ring-accent' : ''}`}
            >
              {em}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Дата">
            <DateInput value={form.date} onChange={(v) => set('date', v)} required />
          </Field>
          <div className="sm:pt-7">
            <Toggle
              checked={form.repeats_yearly}
              onChange={(v) => set('repeats_yearly', v)}
              label="Повторять каждый год"
            />
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Оформление страницы</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEME_KEYS.map((key) => {
              const t = HOLIDAY_THEMES[key]
              const active = form.theme === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('theme', key)}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border p-2.5 text-left text-xs font-semibold transition ${
                    active ? 'border-accent ring-4 ring-accent-soft' : 'border-line hover:border-accent/50'
                  }`}
                >
                  <span
                    className="flex h-9 w-full items-center justify-center rounded-xl text-lg"
                    style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }}
                  >
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
        <Field label="Описание" hint="Необязательно. Видно гостям под отсчётом.">
          <Textarea
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value || null)}
            placeholder="Отмечаем дома, ждём к 18:00"
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

export function HolidaysTab({ holidays, reload }: AdminData) {
  const [editing, setEditing] = useState<AdminHoliday | 'new' | null>(null)
  const [dialog, confirm] = useConfirm()
  const upcomingId = holidays.find((h) => h.next_date)?.id

  const remove = async (h: AdminHoliday) => {
    if (
      !(await confirm(
        'Удалить праздник?',
        <>
          «{h.emoji} {h.name}» будет удалён. Подарки останутся, но отвяжутся от этого праздника.
        </>,
      ))
    )
      return
    await adminApi.deleteHoliday(h.id)
    await reload()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Праздники</h1>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon size={18} /> Добавить
        </Button>
      </div>

      {holidays.length === 0 ? (
        <Empty icon="🎉" title="Праздников пока нет">
          Добавьте первый — гости увидят обратный отсчёт до ближайшего.
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {holidays.map((h) => {
            const past = !h.next_date
            return (
              <li
                key={h.id}
                className={`glass flex items-start gap-3 rounded-3xl border p-4 ${h.id === upcomingId ? 'border-accent/60 ring-4 ring-accent-soft' : 'border-line'} ${past ? 'opacity-60' : ''}`}
              >
                <span className="text-4xl leading-none">{h.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{h.name}</span>
                    {h.id === upcomingId && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-bold text-accent-ink">
                        на главной
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    {h.next_date ? formatLongDate(h.next_date) : `прошёл ${formatLongDate(h.date)}`}
                    {h.repeats_yearly && ' · ежегодно'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5">
                      {HOLIDAY_THEMES[h.theme].icon} {HOLIDAY_THEMES[h.theme].label}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5">
                      {h.gift_count} {plural(h.gift_count, ['подарок', 'подарка', 'подарков'])}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col">
                  <IconButton label="Редактировать" onClick={() => setEditing(h)}>
                    <PencilIcon size={16} />
                  </IconButton>
                  <IconButton label="Удалить" onClick={() => void remove(h)} className="hover:text-red-600!">
                    <TrashIcon size={16} />
                  </IconButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <HolidayForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
      {dialog}
    </div>
  )
}
