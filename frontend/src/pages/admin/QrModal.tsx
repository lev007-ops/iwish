import { useEffect, useRef, useState } from 'react'
import { DownloadIcon } from '../../components/icons'
import { Modal } from '../../components/Modal'
import { Button, Field, Input } from '../../components/ui'
import { DOT_STYLES, QR_PRESETS, downloadBlob, qrSvgBlob, renderCard, type QrCardOptions } from '../../lib/qrCard'
import type { DotType } from 'qr-code-styling'
import type { Guest } from '../../lib/types'

function safeName(s: string) {
  return s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'guest'
}

export function QrModal({ guest, url, onClose }: { guest: Guest; url: string; onClose: () => void }) {
  const [title, setTitle] = useState(`Привет, ${guest.name}!`)
  const [subtitle, setSubtitle] = useState('Здесь мой список желаний 🎁')
  const [footer, setFooter] = useState('Наведи камеру на код')
  const [emoji, setEmoji] = useState('🎁')
  const [presetId, setPresetId] = useState(QR_PRESETS[0].id)
  const [dots, setDots] = useState<DotType>('rounded')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const opts: QrCardOptions = {
    url,
    title,
    subtitle,
    footer,
    emoji,
    dots,
    preset: QR_PRESETS.find((p) => p.id === presetId) ?? QR_PRESETS[0],
  }
  const key = JSON.stringify(opts)

  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const canvas = await renderCard(JSON.parse(key) as QrCardOptions)
        if (cancelled) return
        canvasRef.current = canvas
        setPreview(canvas.toDataURL('image/png'))
        setError(null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Не удалось построить QR-код')
      }
    }, 150)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [key])

  const downloadPng = () =>
    canvasRef.current?.toBlob((b) => b && downloadBlob(b, `iwish-${safeName(guest.name)}.png`), 'image/png')
  const downloadSvg = async () => downloadBlob(await qrSvgBlob(opts), `iwish-${safeName(guest.name)}-qr.svg`)

  return (
    <Modal
      wide
      title={`QR-открытка для «${guest.name}»`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={() => void downloadSvg()}>
            <DownloadIcon size={16} /> Только QR (SVG)
          </Button>
          <Button onClick={downloadPng} disabled={!preview}>
            <DownloadIcon size={16} /> Открытка PNG
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
        <div className="flex items-start justify-center">
          {preview ? (
            <img
              src={preview}
              alt="Предпросмотр открытки с QR-кодом"
              className="w-full max-w-sm rounded-2xl shadow-lg"
            />
          ) : (
            <div className="aspect-[3/4] w-full max-w-sm animate-pulse rounded-2xl bg-surface-2" />
          )}
        </div>
        <div className="space-y-4">
          <Field label="Заголовок">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Подзаголовок">
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Подпись под кодом">
            <Input value={footer} onChange={(e) => setFooter(e.target.value)} maxLength={60} />
          </Field>
          <Field label="Эмодзи в центре" hint="Оставьте пустым, чтобы убрать">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} className="w-24 text-center text-xl!" />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Цвета</span>
            <div className="flex flex-wrap gap-2">
              {QR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={p.id === presetId}
                  onClick={() => setPresetId(p.id)}
                  className={`size-9 rounded-full transition ${p.id === presetId ? 'ring-4 ring-accent ring-offset-2 ring-offset-bg' : 'hover:scale-110'}`}
                  style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Форма точек</span>
            <div className="flex flex-wrap gap-1.5">
              {DOT_STYLES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDots(d.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    dots === d.id ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-ink'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs break-all text-muted">{url}</p>
        </div>
      </div>
    </Modal>
  )
}
