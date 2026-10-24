import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md'
}

const variants = {
  primary:
    'border border-transparent bg-ink text-white hover:bg-gold hover:text-ink disabled:hover:bg-ink disabled:hover:text-white',
  secondary:
    'border border-ink bg-transparent text-ink hover:bg-ink-wash disabled:hover:bg-transparent',
}

const sizes = {
  sm: 'h-8 px-3.5 text-sm',
  md: 'h-[42px] px-[22px] text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded font-medium disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
