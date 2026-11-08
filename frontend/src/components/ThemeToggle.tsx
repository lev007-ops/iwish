import { useColorScheme } from '../lib/scheme'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { scheme, toggle } = useColorScheme()
  const dark = scheme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      className={`glass inline-flex size-10 items-center justify-center rounded-full border border-line text-ink shadow-sm transition hover:scale-105 active:scale-95 ${className}`}
      aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
    >
      {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  )
}
