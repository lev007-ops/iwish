import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { formatDate, parseRuDate } from '../lib/format'
import { CalendarIcon } from './icons'

export const inputCls =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft sm:text-sm'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

/** Date field that always shows dd.mm.yyyy, whatever the browser locale. `value` is YYYY-MM-DD or ''. */
export function DateInput({
  value,
  onChange,
  required,
}: {
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  const [text, setText] = useState(() => (value ? formatDate(value) : ''))
  const picker = useRef<HTMLInputElement>(null)

  // Follow outside changes (e.g. the calendar picker) without clobbering partial typing.
  useEffect(() => {
    if ((parseRuDate(text) ?? '') !== value) setText(value ? formatDate(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const type = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('.')
    setText(masked)
    onChange(parseRuDate(masked) ?? '')
  }

  const invalid = text.length === 10 && !parseRuDate(text)

  return (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => type(e.target.value)}
        placeholder="дд.мм.гггг"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        aria-invalid={invalid || undefined}
        className={`${inputCls} pr-11 tabular-nums ${invalid ? 'border-red-500 focus:border-red-500' : ''}`}
      />
      <button
        type="button"
        onClick={() => {
          const el = picker.current
          if (!el) return
          try {
            el.showPicker()
          } catch {
            el.focus()
          }
        }}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-accent"
        aria-label="Выбрать в календаре"
      >
        <CalendarIcon size={18} />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} resize-y ${props.className ?? ''}`} />
}

type Variant = 'primary' | 'ghost' | 'danger' | 'outline'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink shadow-sm hover:brightness-110',
  outline: 'border border-line bg-surface hover:border-accent hover:text-accent',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'text-red-600 hover:bg-red-500/10 dark:text-red-400',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  )
}

export function IconButton({
  label,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`inline-flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink ${className}`}
    />
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent-soft" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {children}
    </p>
  )
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="glass rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <div className="text-5xl">{icon}</div>
      <p className="mt-3 font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  )
}
