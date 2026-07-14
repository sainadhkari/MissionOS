import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  rightSlot?: ReactNode
}

function AuthInput({
  id,
  label,
  error,
  helperText,
  rightSlot,
  className = '',
  onFocus,
  onBlur,
  ...props
}: AuthInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <motion.div
        className={`relative flex items-center rounded-md border bg-white/90 backdrop-blur-sm transition-colors dark:bg-neutral-900/80 ${
          error
            ? 'border-danger-300 dark:border-danger-800'
            : focused
              ? 'border-primary-500 dark:border-primary-500'
              : 'border-neutral-300 dark:border-neutral-700'
        }`}
        animate={{
          boxShadow: error
            ? '0 0 0 3px rgba(239,68,68,0.12)'
            : focused
              ? '0 0 0 3px rgba(79,70,229,0.16)'
              : '0 0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.2 }}
      >
        <input
          id={id}
          className={`h-9 w-full rounded-md bg-transparent px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none dark:text-neutral-100 dark:placeholder:text-neutral-500 ${className}`}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          {...props}
        />
        {rightSlot && <div className="flex items-center pr-2">{rightSlot}</div>}
      </motion.div>
      {error ? (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      ) : (
        helperText && <p className="text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>
      )}
    </div>
  )
}

export default AuthInput
