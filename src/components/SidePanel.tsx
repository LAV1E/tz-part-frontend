import { useEffect, type ReactNode } from 'react'

export function SidePanel({
  title,
  titleId,
  badge,
  detail,
  pending = false,
  widthClass = 'max-w-xl',
  onClose,
  children,
  footer,
}: {
  title: string
  titleId: string
  badge?: ReactNode
  detail?: string
  pending?: boolean
  widthClass?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, pending])

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close panel"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-line bg-surface shadow-lg"
        style={{ maxWidth: widthClass === 'max-w-lg' ? '32rem' : '48rem' }}
      >
        <div className="flex items-start justify-between gap-md border-b border-line px-lg py-3">
          <div>
            <h2 id={titleId} className="flex flex-wrap items-center gap-sm font-display text-h3 text-ink">
              <span>{title}</span>
              {badge}
            </h2>
            {detail ? <p className="mt-1 font-sans text-sm text-muted">{detail}</p> : null}
          </div>
          <button
            type="button"
            className="font-sans text-sm text-muted hover:text-ink"
            disabled={pending}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-lg py-lg">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-sm border-t border-line px-lg py-3">{footer}</div> : null}
      </div>
    </div>
  )
}
