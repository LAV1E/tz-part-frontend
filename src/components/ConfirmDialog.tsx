import { useEffect } from 'react'

import { Button } from './Button'

export function ConfirmDialog({
  titleId,
  title,
  detail,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  titleId: string
  title: string
  detail: string
  confirmLabel: string
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel, pending])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        disabled={pending}
        onClick={() => {
          if (!pending) onCancel()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm rounded border border-line bg-surface p-lg"
      >
        <h2 id={titleId} className="font-display text-h3 text-ink">
          {title}
        </h2>
        <p className="mt-sm font-sans text-sm text-muted">{detail}</p>
        <div className="mt-lg flex justify-end gap-sm">
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
