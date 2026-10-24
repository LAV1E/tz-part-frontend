import type { InputHTMLAttributes } from 'react'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  labelStyle?: 'default' | 'caption'
}

export function TextField({ id, label, error, labelStyle = 'default', className = '', ...props }: TextFieldProps) {
  const labelClass =
    labelStyle === 'caption'
      ? 'mb-1.5 block font-sans text-xs font-medium uppercase tracking-wide text-muted'
      : 'mb-1.5 block font-sans text-sm font-medium text-copy'
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        className={`h-[42px] w-full rounded border bg-white px-3.5 font-sans text-sm text-copy outline-none hover:border-ink focus:border-gold focus:shadow-focus disabled:border-line disabled:bg-wash ${error ? 'border-error shadow-error-ring' : 'border-line'} ${className}`}
        {...props}
      />
      {error ? <p className="mt-1 font-sans text-xs text-error">{error}</p> : null}
    </div>
  )
}
