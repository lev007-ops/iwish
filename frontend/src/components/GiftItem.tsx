import { useState } from 'react'
import { formatPrice, hostOf } from '../lib/format'
import type { PublicGift } from '../lib/types'
import { CheckIcon, ChevronIcon, ExternalIcon, HeartIcon } from './icons'

interface Props {
  gift: PublicGift
  onLike: (gift: PublicGift) => void
  /** Omitted when the list owner is viewing: no reserve button, no hint. */
  onReserve?: (gift: PublicGift) => void
  busy: boolean
}

function Thumb({ src, className }: { src: string | null; className: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed)
    return (
      <div className={`flex items-center justify-center bg-accent-soft text-2xl ${className}`} aria-hidden>
        🎁
      </div>
    )
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  )
}

export function GiftItem({ gift, onLike, onReserve, busy }: Props) {
  const [open, setOpen] = useState(false)
  const [pop, setPop] = useState(false)
  const price = formatPrice(gift)
  const reservedByOther = gift.reservation === 'other'
  const panelId = `gift-${gift.id}`

  const like = () => {
    setPop(true)
    onLike(gift)
  }

  return (
    <li
      className={`glass overflow-hidden rounded-3xl border shadow-sm transition-[box-shadow,border-color] duration-300 ${open ? 'border-accent/40 shadow-lg' : 'border-line hover:shadow-md'} ${reservedByOther ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-3 p-3 sm:gap-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left sm:gap-4"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <Thumb src={gift.thumb} className="size-14 shrink-0 rounded-2xl sm:size-16" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold sm:text-lg">{gift.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              {price && <span className="font-medium whitespace-nowrap">{price}</span>}
              {gift.reservation === 'mine' && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
                  Вы дарите
                </span>
              )}
              {reservedByOther && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">Уже выбрали</span>
              )}
            </div>
          </div>
          <ChevronIcon
            className={`shrink-0 text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={like}
          onAnimationEnd={() => setPop(false)}
          className={`shrink-0 rounded-full p-2.5 transition-colors ${gift.liked ? 'text-accent-2' : 'text-muted hover:text-accent-2'} ${pop ? 'animate-pop' : ''}`}
          aria-pressed={gift.liked}
          aria-label={gift.liked ? 'Убрать лайк' : 'Нравится'}
          title={gift.liked ? 'Убрать лайк' : 'Нравится — поднимется наверх'}
        >
          <HeartIcon filled={gift.liked} size={22} />
        </button>
      </div>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="space-y-4 px-3 pb-4 sm:px-4">
            {gift.photo && (
              <a href={gift.photo} target="_blank" rel="noreferrer" className="block">
                <img
                  src={gift.photo}
                  alt={gift.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-[60vh] w-full rounded-2xl bg-surface-2 object-contain"
                />
              </a>
            )}
            <h3 className="text-lg font-bold sm:text-xl">{gift.name}</h3>
            {price && (
              <p className="text-base">
                <span className="text-muted">Цена: </span>
                <span className="font-semibold">{price}</span>
              </p>
            )}
            {gift.description && (
              <p className="text-[0.95rem] leading-relaxed break-words whitespace-pre-line text-ink/90">
                {gift.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {gift.link && (
                <a
                  href={gift.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-sm transition hover:brightness-110 active:scale-[0.98]"
                >
                  Где купить · {hostOf(gift.link)}
                  <ExternalIcon size={16} />
                </a>
              )}
              {!onReserve ? null : gift.reservation !== 'other' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onReserve(gift)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                    gift.reservation === 'mine'
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-surface hover:border-accent hover:text-accent'
                  }`}
                >
                  {gift.reservation === 'mine' ? (
                    <>
                      <CheckIcon size={16} /> Я дарю это · отменить
                    </>
                  ) : (
                    '🎁 Я подарю это'
                  )}
                </button>
              ) : (
                <span className="inline-flex items-center rounded-full bg-surface-2 px-4 py-2.5 text-sm text-muted">
                  Этот подарок уже кто-то выбрал
                </span>
              )}
            </div>
            {onReserve && gift.reservation === 'none' && (
              <p className="text-xs text-muted">
                Отметка видна только гостям — чтобы никто не купил то же самое. Хозяин списка её не видит.
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
