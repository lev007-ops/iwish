import { useState, type FormEvent } from 'react'
import { CheckIcon, CopyIcon, PencilIcon, PlusIcon, QrIcon, TrashIcon } from '../../components/icons'
import { Modal } from '../../components/Modal'
import { Button, Empty, ErrorText, Field, IconButton, Input } from '../../components/ui'
import { useConfirm } from '../../components/useConfirm'
import { adminApi } from '../../lib/api'
import { formatLongDateTime, plural } from '../../lib/format'
import type { Guest } from '../../lib/types'
import type { AdminData } from './AdminApp'
import { QrModal } from './QrModal'

const linkFor = (g: Guest) => `${window.location.origin}/g/${g.id}`

function RenameModal({ guest, onClose, onSaved }: { guest: Guest; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(guest.name)
  const [error, setError] = useState<string | null>(null)
  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    try {
      await adminApi.updateGuest(guest.id, name)
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <Modal
      title="Изменить имя"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => void save()} disabled={!name.trim()}>
            Сохранить
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-3">
        <Field label="Имя" hint="Ссылка и QR-код не изменятся — гость сразу увидит новое обращение.">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <ErrorText>{error}</ErrorText>
      </form>
    </Modal>
  )
}

function formatSeen(s: string | null) {
  if (!s) return 'ещё не открывали'
  const d = new Date(s.endsWith('Z') ? s : `${s}Z`)
  return `был(а) ${formatLongDateTime(d)}`
}

export function GuestsTab({ guests, reload }: AdminData) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [qrFor, setQrFor] = useState<Guest | null>(null)
  const [renaming, setRenaming] = useState<Guest | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [dialog, confirm] = useConfirm()

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const g = await adminApi.createGuest(name)
      setName('')
      await reload()
      setQrFor(g)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const copy = async (g: Guest) => {
    try {
      await navigator.clipboard.writeText(linkFor(g))
      setCopied(g.id)
      window.setTimeout(() => setCopied((c) => (c === g.id ? null : c)), 1500)
    } catch {
      window.prompt('Скопируйте ссылку', linkFor(g))
    }
  }

  const remove = async (g: Guest) => {
    if (
      !(await confirm(
        'Удалить ссылку?',
        <>Ссылка для «{g.name}» перестанет работать, приветствие по имени пропадёт. Лайки и брони гостя сохранятся.</>,
      ))
    )
      return
    await adminApi.deleteGuest(g.id)
    await reload()
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Персональные ссылки</h1>
      <p className="mb-4 text-sm text-muted">
        Гость, открывший свою ссылку или QR-код, увидит приветствие по имени.
      </p>

      <form onSubmit={create} className="glass mb-5 flex flex-col gap-2 rounded-3xl border border-line p-3 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя гостя, например «Бабушка» или «Миша»"
          maxLength={200}
          className="flex-1"
        />
        <Button type="submit" disabled={!name.trim()}>
          <PlusIcon size={18} /> Создать ссылку
        </Button>
      </form>
      <div className="mb-4">
        <ErrorText>{error}</ErrorText>
      </div>

      {guests.length === 0 ? (
        <Empty icon="🔗" title="Ссылок пока нет">
          Создайте ссылку — и сразу получите красивый QR-код для открытки.
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {guests.map((g) => (
            <li key={g.id} className="glass rounded-3xl border border-line p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-lg font-bold text-accent">
                  {g.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{g.name}</div>
                  <div className="text-xs text-muted">
                    {g.device_count > 0
                      ? `${g.device_count} ${plural(g.device_count, ['устройство', 'устройства', 'устройств'])} · ${formatSeen(g.last_seen_at)}`
                      : formatSeen(null)}
                  </div>
                </div>
                <IconButton label="Переименовать" onClick={() => setRenaming(g)}>
                  <PencilIcon size={16} />
                </IconButton>
                <IconButton label="Удалить" onClick={() => void remove(g)} className="hover:text-red-600!">
                  <TrashIcon size={16} />
                </IconButton>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-surface-2 px-3 py-2 text-xs">{linkFor(g)}</code>
                <IconButton label="Скопировать ссылку" onClick={() => void copy(g)}>
                  {copied === g.id ? <CheckIcon size={16} className="text-green-600" /> : <CopyIcon size={16} />}
                </IconButton>
                <Button variant="outline" className="px-3! py-2!" onClick={() => setQrFor(g)}>
                  <QrIcon size={16} /> QR
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {qrFor && <QrModal guest={qrFor} url={linkFor(qrFor)} onClose={() => setQrFor(null)} />}
      {renaming && (
        <RenameModal
          guest={renaming}
          onClose={() => setRenaming(null)}
          onSaved={() => {
            setRenaming(null)
            void reload()
          }}
        />
      )}
      {dialog}
    </div>
  )
}
