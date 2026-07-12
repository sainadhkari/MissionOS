import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  durationMs?: number
  className?: string
  prefix?: string
  suffix?: string
}

/** Counts up from its previous value to `value` whenever `value` changes,
 * using a single rAF loop (not `setInterval`) so it stays smooth and
 * cancels cleanly on unmount or rapid prop changes. */
function AnimatedCounter({ value, durationMs = 900, className = '', prefix = '', suffix = '' }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const fromRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / durationMs)
      // Ease-out cubic -- fast start, gentle settle.
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(from + (to - from) * eased))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [value, durationMs])

  return (
    <span className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

export default AnimatedCounter
