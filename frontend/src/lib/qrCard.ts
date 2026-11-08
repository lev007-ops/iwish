import QRCodeStyling, { type DotType, type Options } from 'qr-code-styling'

export interface QrPreset {
  id: string
  label: string
  colors: [string, string]
}

export const QR_PRESETS: QrPreset[] = [
  { id: 'violet', label: 'Фиалка', colors: ['#7c3aed', '#ec4899'] },
  { id: 'newyear', label: 'Новогодний', colors: ['#0f2648', '#c8102e'] },
  { id: 'party', label: 'Праздник', colors: ['#e11d74', '#f59e0b'] },
  { id: 'love', label: 'Любовь', colors: ['#be123c', '#fb7185'] },
  { id: 'spring', label: 'Весна', colors: ['#16a34a', '#db2777'] },
  { id: 'ocean', label: 'Океан', colors: ['#0369a1', '#14b8a6'] },
  { id: 'pumpkin', label: 'Тыква', colors: ['#ea580c', '#3b0764'] },
  { id: 'gold', label: 'Золото', colors: ['#7c5a12', '#d4a73a'] },
  { id: 'graphite', label: 'Графит', colors: ['#111827', '#4b5563'] },
]

export const DOT_STYLES: { id: DotType; label: string }[] = [
  { id: 'rounded', label: 'Скруглённые' },
  { id: 'dots', label: 'Точки' },
  { id: 'classy-rounded', label: 'Элегантные' },
  { id: 'extra-rounded', label: 'Мягкие' },
  { id: 'square', label: 'Квадраты' },
]

export interface QrCardOptions {
  url: string
  title: string
  subtitle: string
  footer: string
  emoji: string
  preset: QrPreset
  dots: DotType
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'

function emojiDataUrl(emoji: string): string | undefined {
  if (!emoji.trim()) return undefined
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `200px ${EMOJI_FONT}`
  ctx.fillText(emoji, 128, 140)
  return c.toDataURL('image/png')
}

function qrOptions(o: QrCardOptions, size: number, type: 'canvas' | 'svg'): Partial<Options> {
  const [a, b] = o.preset.colors
  const gradient = {
    type: 'linear' as const,
    rotation: Math.PI / 4,
    colorStops: [
      { offset: 0, color: a },
      { offset: 1, color: b },
    ],
  }
  return {
    width: size,
    height: size,
    type,
    data: o.url,
    margin: 0,
    image: emojiDataUrl(o.emoji),
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: { type: o.dots, gradient },
    cornersSquareOptions: { type: 'extra-rounded', color: a },
    cornersDotOptions: { type: 'dot', color: b },
    backgroundOptions: { color: '#ffffff' },
    imageOptions: { margin: 10, imageSize: 0.32, hideBackgroundDots: true },
  }
}

export async function qrSvgBlob(o: QrCardOptions): Promise<Blob> {
  const qr = new QRCodeStyling(qrOptions(o, 1024, 'svg'))
  const raw = await qr.getRawData('svg')
  return raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: 'image/svg+xml' })
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min: number, family: string, weight: number) {
  let size = start
  for (; size > min; size -= 4) {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) return
  }
  ctx.font = `${weight} ${min}px ${family}`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Render a printable 1080×1440 card: greeting with the name + styled QR. */
export async function renderCard(o: QrCardOptions): Promise<HTMLCanvasElement> {
  const W = 1080
  const H = 1440
  const QR = 720
  const display = '"Unbounded", "Manrope", system-ui, sans-serif'
  const body = '"Manrope", system-ui, sans-serif'
  await Promise.all([
    document.fonts.load(`800 80px Unbounded`, o.title),
    document.fonts.load(`600 40px Manrope`, o.subtitle),
  ]).catch(() => undefined)

  const qr = new QRCodeStyling(qrOptions(o, QR, 'canvas'))
  const raw = await qr.getRawData('png')
  const qrBlob = raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: 'image/png' })
  const qrImg = await createImageBitmap(qrBlob)

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const [a, b] = o.preset.colors

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, a)
  bg.addColorStop(1, b)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Soft bokeh circles
  ctx.fillStyle = 'rgba(255,255,255,0.09)'
  for (const [x, y, r] of [
    [120, 160, 220],
    [980, 330, 160],
    [900, 1330, 260],
    [80, 1200, 120],
  ]) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 24
  fitFont(ctx, o.title, W - 140, 92, 44, display, 800)
  ctx.fillText(o.title, W / 2, 210)
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  fitFont(ctx, o.subtitle, W - 160, 42, 26, body, 600)
  ctx.fillText(o.subtitle, W / 2, 290)

  // White panel with the QR
  const pad = 56
  const px = (W - QR) / 2 - pad
  const py = 370
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 20
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, px, py, QR + pad * 2, QR + pad * 2, 64)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.drawImage(qrImg, px + pad, py + pad, QR, QR)

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  fitFont(ctx, o.footer, W - 160, 38, 24, body, 700)
  ctx.fillText(o.footer, W / 2, py + QR + pad * 2 + 95)

  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `600 30px ${body}`
  ctx.fillText(new URL(o.url).host, W / 2, py + QR + pad * 2 + 150)

  return c
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
