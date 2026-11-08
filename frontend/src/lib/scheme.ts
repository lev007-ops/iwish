import { useCallback, useEffect, useState } from 'react'

const KEY = 'iwish-scheme'
type Scheme = 'light' | 'dark'

function systemScheme(): Scheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function stored(): Scheme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** Light/dark scheme: follows the system until the user picks one explicitly. */
export function useColorScheme() {
  const [scheme, setScheme] = useState<Scheme>(() => stored() ?? systemScheme())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', scheme === 'dark')
  }, [scheme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (!stored()) setScheme(systemScheme())
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setScheme((s) => {
      const next = s === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [])

  return { scheme, toggle }
}
