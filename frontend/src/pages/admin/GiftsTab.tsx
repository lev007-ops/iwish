import { useMemo, useRef, useState, type FormEvent } from 'react'
import { HeartIcon, PencilIcon, PlusIcon, TrashIcon, UploadIcon, XIcon } from '../../components/icons'
import { Modal } from '../../components/Modal'
import { Button, Empty, ErrorText, Field, IconButton, Input, Textarea, Toggle, inputCls } from '../../components/ui'
import { useConfirm } from '../../components/useConfirm'
import { adminApi } from '../../lib/api'
import { CURRENCIES, formatPrice } from '../../lib/format'
import type { AdminGift, AdminHoliday, GiftInput } from '../../lib/types'
import type { AdminData } from './AdminApp'

const DESIRE_LABELS = ['', 'Было бы неплохо', 'Хочу', 'Очень хочу', 'Мечтаю', 'Больше всего на свете']

function parsePrice(s: string): number | null {
  const v = s.replace(/\s/g, '').replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function Stars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex" role={onChange ? 'radiogroup' : undefined} aria-label="Степень желания">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value
        const cls = `${size === 'sm' ? 'text-sm' : 'text-2xl px-0.5'} ${on ? '' : 'opacity-25 grayscale'}`
        return onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} — ${DESIRE_LABELS[n]}`}
            onClick={() => onChange(n)}
            className={`${cls} transition hover:scale-110`}
          >
            🔥
          </button>
        ) : (
          <span key={n} className={cls} aria-hidden>
            🔥
          </span>
        )
      })}
    </span>
  )
}

function toInput(g: AdminGift | null): GiftInput {
  return {
    name: g?.name ?? '',
    description: g?.description ?? null,
    price_min: g?.price_min ?? null,
    price_max: g?.price_max ?? null,
    price_approx: g?.price_approx ?? false,
    currency: g?.currency ?? 'RUB',
    photo_file: g?.photo_file ?? null,
    photo_url: g?.photo_url ?? null,
    link: g?.link ?? null,
    desire: g?.desire ?? 3,
    archived: g?.archived ?? false,
    holiday_ids: g?.holiday_ids ?? [],
  }
}

function GiftForm({
  initial,
  holidays,
  defaultHolidayId,
  onClose,
  onSaved,
}: {
  initial: AdminGift | null
  holidays: AdminHoliday[]
  defaultHolidayId: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<GiftInput>(() => {
    const f = toInput(initial)
    if (!initial && defaultHolidayId) f.holiday_ids = [defaultHolidayId]
    return f
  })
  const [priceMin, setPriceMin] = useState(initial?.price_min?.toString() ?? '')
  const [priceMax, setPriceMax] = useState(initial?.price_max?.toString() ?? '')
  const [preview, setPreview] = useState<string | null>(initial?.photo ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof GiftInput>(k: K, v: GiftInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const upload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const r = await adminApi.upload(file)
      setForm((f) => ({ ...f, photo_file: r.photo_file, photo_url: null }))
      setPreview(r.photo)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const toggleHoliday = (id: number) =>
    set('holiday_ids', form.holiday_ids.includes(id) ? form.holiday_ids.filter((x) => x !== id) : [...form.holiday_ids, id])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const body: GiftInput = { ...form, price_min: parsePrice(priceMin), price_max: parsePrice(priceMax) }
    if ((priceMin && body.price_min == null) || (priceMax && body.price_max == null)) {
      setError('Цена должна быть числом')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (initial) await adminApi.updateGift(initial.id, body)
      else await adminApi.createGift(body)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  const preview_ = formatPrice({ ...form, price_min: parsePrice(priceMin), price_max: parsePrice(priceMax) })

  return (
    <Modal
      wide
      title={initial ? 'Редактировать подарок' : 'Новый подарок'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => void submit()} disabled={busy || uploading || !form.name.trim()}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1fr_15rem]">
        <div className="space-y-4">
          <Field label="Название">
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Наушники Sony WH-1000XM5"
              required
              autoFocus
            />
          </Field>
          <Field label="Описание" hint="Необязательно: цвет, размер, модель, пожелания">
            <Textarea
              rows={4}
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value || null)}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Стоимость</span>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Input inputMode="decimal" placeholder="от" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
              <span className="text-muted">–</span>
              <Input inputMode="decimal" placeholder="до (необяз.)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <select
                className={inputCls}
                value={form.currency ?? ''}
                onChange={(e) => set('currency', e.target.value || null)}
                aria-label="Валюта"
              >
                <option value="">Без валюты</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Toggle checked={form.price_approx} onChange={(v) => set('price_approx', v)} label="Примерно (~)" />
            </div>
            {preview_ && <p className="mt-1.5 text-xs text-muted">Гости увидят: {preview_}</p>}
          </div>
          <Field label="Ссылка для покупки" hint="Необязательно">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={form.link ?? ''}
              onChange={(e) => set('link', e.target.value || null)}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Степень желания</span>
            <div className="flex flex-wrap items-center gap-3">
              <Stars value={form.desire} onChange={(v) => set('desire', v)} />
              <span className="text-sm text-muted">{DESIRE_LABELS[form.desire]}</span>
            </div>
            <span className="mt-1 block text-xs text-muted">Гости её не видят — только порядок в списке.</span>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Показывать на праздниках</span>
            {holidays.length === 0 ? (
              <p className="text-sm text-muted">Сначала создайте праздник на вкладке «Праздники».</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {holidays.map((h) => {
                  const on = form.holiday_ids.includes(h.id)
                  return (
                    <button
                      key={h.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleHoliday(h.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        on ? 'border-accent bg-accent text-accent-ink' : 'border-line hover:border-accent/60'
                      } ${!h.next_date && !on ? 'opacity-60' : ''}`}
                    >
                      {h.emoji} {h.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <Toggle checked={form.archived} onChange={(v) => set('archived', v)} label="Скрыть от гостей (уже подарили)" />
        </div>

        <div className="space-y-3 md:order-none">
          <span className="block text-sm font-semibold">Фото</span>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-dashed border-line bg-surface-2">
            {preview ? (
              <>
                <img src={preview} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, photo_file: null, photo_url: null }))
                    setPreview(null)
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  aria-label="Убрать фото"
                >
                  <XIcon size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex size-full flex-col items-center justify-center gap-2 text-sm text-muted hover:text-accent"
              >
                <UploadIcon size={28} />
                {uploading ? 'Загружаем…' : 'Загрузить фото'}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          />
          {preview && (
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <UploadIcon size={16} /> {uploading ? 'Загружаем…' : 'Заменить'}
            </Button>
          )}
          <Field label="…или ссылка на картинку">
            <Input
              type="url"
              placeholder="https://…/photo.jpg"
              value={form.photo_url ?? ''}
              onChange={(e) => {
                const v = e.target.value || null
                setForm((f) => ({ ...f, photo_url: v, photo_file: v ? null : f.photo_file }))
                setPreview(v)
              }}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <ErrorText>{error}</ErrorText>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}

type Filter = 'all' | 'none' | 'archived' | number

export function GiftsTab({ gifts, holidays, reload }: AdminData) {
  const [editing, setEditing] = useState<AdminGift | 'new' | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [dialog, confirm] = useConfirm()
  const holidayById = useMemo(() => new Map(holidays.map((h) => [h.id, h])), [holidays])

  const shown = gifts.filter((g) => {
    if (filter === 'archived') return g.archived
    if (filter === 'all') return true
    if (g.archived) return false
    if (filter === 'none') return g.holiday_ids.length === 0
    return g.holiday_ids.includes(filter)
  })

  const remove = async (g: AdminGift) => {
    if (!(await confirm('Удалить подарок?', <>«{g.name}» будет удалён вместе с лайками.</>))) return
    await adminApi.deleteGift(g.id)
    await reload()
  }

  const chip = (value: Filter, label: string) => (
    <button
      key={String(value)}
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
        filter === value ? 'bg-ink text-bg' : 'bg-surface-2 text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Подарки</h1>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon size={18} /> Добавить
        </Button>
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip('all', `Все · ${gifts.length}`)}
        {holidays.map((h) => chip(h.id, `${h.emoji} ${h.name}`))}
        {chip('none', 'Без праздника')}
        {chip('archived', 'Скрытые')}
      </div>

      {shown.length === 0 ? (
        <Empty icon="🎁" title={gifts.length ? 'Здесь пусто' : 'Подарков пока нет'}>
          {gifts.length ? 'Под этот фильтр ничего не подходит.' : 'Добавьте первое желание.'}
        </Empty>
      ) : (
        <ul className="space-y-2.5">
          {shown.map((g) => {
            const price = formatPrice(g)
            return (
              <li
                key={g.id}
                className={`glass flex items-center gap-3 rounded-3xl border border-line p-3 ${g.archived ? 'opacity-55' : ''}`}
              >
                <button type="button" onClick={() => setEditing(g)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {g.thumb ? (
                    <img src={g.thumb} alt="" className="size-14 shrink-0 rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl">🎁</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{g.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
                      <Stars value={g.desire} size="sm" />
                      {price && <span className="whitespace-nowrap">{price}</span>}
                      {g.like_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-accent-2" title="Лайков от гостей">
                          <HeartIcon filled size={13} /> {g.like_count}
                        </span>
                      )}
                      <span className="truncate">
                        {g.holiday_ids.map((id) => holidayById.get(id)?.emoji).join(' ') || (
                          <span className="text-xs">нет праздника</span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 items-center">
                  <IconButton label="Редактировать" onClick={() => setEditing(g)}>
                    <PencilIcon size={16} />
                  </IconButton>
                  <IconButton label="Удалить" onClick={() => void remove(g)} className="hover:text-red-600!">
                    <TrashIcon size={16} />
                  </IconButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <GiftForm
          initial={editing === 'new' ? null : editing}
          holidays={holidays}
          defaultHolidayId={typeof filter === 'number' ? filter : (holidays.find((h) => h.next_date)?.id ?? null)}
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
