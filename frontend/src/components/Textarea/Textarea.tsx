import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

function Textarea({ id, label, error, helperText, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`rounded-md border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? 'border-danger-300 focus:ring-danger-500'
            : 'border-neutral-300 focus:ring-primary-500'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-neutral-500">{helperText}</p>
      )}
    </div>
  )
}

export default Textarea
