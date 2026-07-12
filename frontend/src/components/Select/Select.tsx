import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
}

function Select({ id, label, error, helperText, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`h-9 w-full appearance-none rounded-md border bg-white px-3 pr-9 text-sm text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 dark:bg-neutral-900 dark:text-neutral-100 ${
            error
              ? 'border-danger-300 focus:ring-danger-500 dark:border-danger-800'
              : 'border-neutral-300 focus:ring-primary-500 dark:border-neutral-700'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      ) : (
        helperText && <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
      )}
    </div>
  )
}

export default Select
