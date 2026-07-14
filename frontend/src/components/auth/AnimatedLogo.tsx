import { Boxes } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuthAgent } from './AuthAgentContext'

function AnimatedLogo() {
  const { status } = useAuthAgent()
  const reduceMotion = useReducedMotion()
  const isSuccess = status === 'success'

  return (
    <motion.span
      className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm"
      animate={
        reduceMotion
          ? undefined
          : isSuccess
            ? {
                scale: [1, 1.18, 1],
                boxShadow: [
                  '0 0 0 rgba(255,255,255,0)',
                  '0 0 24px 6px rgba(255,255,255,0.55)',
                  '0 0 0 rgba(255,255,255,0)',
                ],
              }
            : {
                boxShadow: [
                  '0 0 0 rgba(255,255,255,0)',
                  '0 0 12px 2px rgba(255,255,255,0.18)',
                  '0 0 0 rgba(255,255,255,0)',
                ],
              }
      }
      transition={isSuccess ? { duration: 0.9, repeat: 2 } : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Boxes className="h-5 w-5" aria-hidden="true" />
    </motion.span>
  )
}

export default AnimatedLogo
