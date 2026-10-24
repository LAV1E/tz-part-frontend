import type { ReactNode } from 'react'

export function CheckOption({
  checked,
  disabled = false,
  onChange,
  label,
  detail,
}: {
  checked: boolean
  disabled?: boolean
  onChange: () => void
  label: ReactNode
  detail?: ReactNode
}) {
  return (
    <label className={`flex items-start gap-2.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border peer-focus-visible:shadow-focus ${
          checked ? 'border-ink bg-ink text-white' : 'border-line bg-white'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
            <path
              d="M3.5 8.2 6.4 11.2 12.5 4.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block font-sans text-sm font-medium text-ink">{label}</span>
        {detail ? <span className="mt-0.5 block font-sans text-xs text-muted">{detail}</span> : null}
      </span>
    </label>
  )
}
