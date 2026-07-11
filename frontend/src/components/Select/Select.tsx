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
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className={`h-9 w-full appearance-none rounded-md border bg-white px-3 pr-9 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-danger-300 focus:ring-danger-500'
              : 'border-neutral-300 focus:ring-primary-500'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
      </div>
      {error ? (
        <p className="text-xs text-danger-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-neutral-500">{helperText}</p>
      )}
    </div>
  )
}

export default Select
