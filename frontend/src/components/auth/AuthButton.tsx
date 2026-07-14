import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

interface Ripple {
  id: number
  x: number
  y: number
}

interface AuthButtonProps {
  isSubmitting?: boolean
  isSuccess?: boolean
  loadingText?: string
  type?: 'button' | 'submit' | 'reset'
  className?: string
  disabled?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

function AuthButton({
  isSubmitting,
  isSuccess,
  loadingText,
  children,
  className = '',
  onClick,
  disabled,
  type = 'button',
}: AuthButtonProps) {
  const reduceMotion = useReducedMotion()
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rippleTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    const timersOnMount = rippleTimers.current
    return () => {
      timersOnMount.forEach((timer) => clearTimeout(timer))
      timersOnMount.clear()
    }
  }, [])

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!reduceMotion) {
      const bounds = event.currentTarget.getBoundingClientRect()
      const id = Date.now()
      setRipples((prev) => [...prev, { id, x: event.clientX - bounds.left, y: event.clientY - bounds.top }])
      const timer = setTimeout(() => {
        rippleTimers.current.delete(timer)
        setRipples((prev) => prev.filter((ripple) => ripple.id !== id))
      }, 600)
      rippleTimers.current.add(timer)
    }
    onClick?.(event)
  }

  const isBusy = isSubmitting || isSuccess

  return (
    <motion.button
      className={`relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-gradient-to-r from-primary-600 to-violet-600 text-sm font-medium text-white shadow-sm transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:pointer-events-none disabled:opacity-60 ${className}`}
      whileHover={reduceMotion || disabled || isBusy ? undefined : { scale: 1.02, boxShadow: '0 12px 24px -8px rgba(79,70,229,0.45)' }}
      whileTap={reduceMotion || disabled || isBusy ? undefined : { scale: 0.98 }}
      onClick={handleClick}
      disabled={disabled || isSubmitting}
      type={type}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/30"
          style={{ left: ripple.x, top: ripple.y, width: 8, height: 8, x: '-50%', y: '-50%' }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 24, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
      <AnimatePresence mode="wait" initial={false}>
        {isSuccess ? (
          <motion.span
            key="success"
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Success
          </motion.span>
        ) : isSubmitting ? (
          <motion.span key="loading" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {loadingText ?? children}
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export default AuthButton
