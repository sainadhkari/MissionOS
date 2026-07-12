import type { PropsWithChildren } from 'react'
import { useInView } from '../../hooks/useInView'

interface RevealProps {
  className?: string
  /** Stagger multiple Reveals in the same section by passing increasing delays. */
  delayMs?: number
}

function Reveal({ children, className = '', delayMs = 0 }: PropsWithChildren<RevealProps>) {
  const { ref, isInView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{ transitionDelay: isInView ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

export default Reveal
