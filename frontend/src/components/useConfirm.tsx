import { useCallback, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './ui'

interface Pending {
  title: string
  body: ReactNode
  action: string
  resolve: (ok: boolean) => void
}

/** In-app confirmation dialog: `const [dialog, confirm] = useConfirm(); if (await confirm(...))`. */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback(
    (title: string, body: ReactNode, action = 'Удалить') =>
      new Promise<boolean>((resolve) => setPending({ title, body, action, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  const dialog = pending ? (
    <Modal
      title={pending.title}
      onClose={() => close(false)}
      footer={
        <>
          <Button variant="ghost" onClick={() => close(false)}>
            Отмена
          </Button>
          <Button className="bg-red-600! text-white!" onClick={() => close(true)}>
            {pending.action}
          </Button>
        </>
      }
    >
      <div className="text-sm text-muted">{pending.body}</div>
    </Modal>
  ) : null

  return [dialog, confirm] as const
}
