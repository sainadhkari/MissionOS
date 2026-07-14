import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { AGENT_CONFIGS } from './agentConfig'

const SUBMITTING_PHRASES = [
  'Authenticating identity…',
  'Initializing AI agents…',
  'Loading business intelligence…',
  'Preparing executive dashboard…',
]

interface LoginAnimationProps {
  phase: 'submitting' | 'success'
  variant?: 'login' | 'register'
  onDone: () => void
}

/**
 * Mounted only while a phase is active (see call sites) so a fresh submit
 * attempt always starts this component's state from scratch via remount,
 * rather than resetting state imperatively inside an effect.
 */
function LoginAnimation({ phase, variant = 'login', onDone }: LoginAnimationProps) {
  const reduceMotion = useReducedMotion()
  const [phraseIndex, setPhraseIndex] = useState(0)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (phase !== 'submitting') return
    const interval = setInterval(() => {
      setPhraseIndex((i) => Math.min(i + 1, SUBMITTING_PHRASES.length - 1))
    }, 750)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase !== 'success') return

    if (reduceMotion) {
      const timeout = setTimeout(() => onDoneRef.current(), 150)
      return () => clearTimeout(timeout)
    }

    const chipsDuration = AGENT_CONFIGS.length * 260
    const tailDelay = variant === 'login' ? 550 + chipsDuration + 700 : 550 + chipsDuration + 400
    const timeout = setTimeout(() => onDoneRef.current(), tailDelay)
    return () => clearTimeout(timeout)
  }, [phase, reduceMotion, variant])

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl bg-white/90 px-6 text-center backdrop-blur-sm dark:bg-neutral-900/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0.05 : 0.3 }}
        role="status"
        aria-live="polite"
      >
        <motion.span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-glow"
          animate={reduceMotion ? undefined : { scale: [1, 1.1, 1] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </motion.span>

        {phase === 'submitting' && (
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseIndex}
              className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {SUBMITTING_PHRASES[phraseIndex]}
            </motion.p>
          </AnimatePresence>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-3">
            {variant === 'login' && (
              <motion.p
                className="text-sm font-semibold text-neutral-900 dark:text-neutral-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Welcome back
              </motion.p>
            )}
            <div className="flex flex-col gap-1.5">
              {AGENT_CONFIGS.map((config, i) => (
                <motion.p
                  key={config.id}
                  className="flex items-center justify-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.26, duration: 0.3 }}
                >
                  <span>{config.celebrationEmoji}</span>
                  {config.celebrationLabel}
                </motion.p>
              ))}
            </div>
            {variant === 'login' && (
              <motion.p
                className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 + AGENT_CONFIGS.length * 0.26 + 0.2 }}
              >
                Launching MissionOS…
              </motion.p>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default LoginAnimation
