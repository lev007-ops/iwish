import { useState, type FormEvent } from 'react'
import { ThemeToggle } from '../../components/ThemeToggle'
import { Button, ErrorText, Input } from '../../components/ui'
import { adminApi } from '../../lib/api'

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminApi.login(password)
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <ThemeToggle className="fixed top-4 right-4" />
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-4xl border border-line p-7 shadow-xl">
        <div className="text-center text-5xl">🔐</div>
        <h1 className="font-display mt-3 text-center text-2xl font-bold">
          i<span className="text-accent">Wish</span> admin
        </h1>
        <p className="mt-1 text-center text-sm text-muted">Введите пароль, чтобы управлять списком</p>
        <div className="mt-6 space-y-3">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" className="w-full" disabled={busy || !password}>
            {busy ? 'Входим…' : 'Войти'}
          </Button>
        </div>
      </form>
    </div>
  )
}
