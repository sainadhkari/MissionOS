import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

function Input({ id, label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`h-9 rounded-md border bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 ${
          error
            ? 'border-danger-300 focus:ring-danger-500 dark:border-danger-800'
            : 'border-neutral-300 focus:ring-primary-500 dark:border-neutral-700'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      ) : (
        helperText && <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
      )}
    </div>
  )
}

export default Input
