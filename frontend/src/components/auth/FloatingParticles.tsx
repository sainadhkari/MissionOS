import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface FloatingParticlesProps {
  count?: number
  /** "r,g,b" channel string */
  color?: string
  mode?: 'ambient' | 'network'
  className?: string
}

interface Particle {
  top: number
  left: number
  size: number
  delay: number
  duration: number
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    return {
      top: 50 + Math.sin(angle * 1.7 + i) * 38,
      left: 50 + Math.cos(angle * 1.3 + i * 2) * 42,
      size: 2 + ((i * 37) % 5),
      delay: (i * 0.35) % 2.4,
      duration: 8 + ((i * 53) % 6),
    }
  })
}

function FloatingParticles({ count = 8, color = '255,255,255', mode = 'ambient', className = '' }: FloatingParticlesProps) {
  const reduceMotion = useReducedMotion()
  const particles = useMemo(() => generateParticles(count), [count])

  if (reduceMotion) return null

  if (mode === 'network') {
    const points = particles.map((p) => ({ x: p.left, y: p.top }))
    return (
      <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {points.slice(1).map((p, i) => (
            <motion.line
              key={i}
              x1={`${points[i].x}%`}
              y1={`${points[i].y}%`}
              x2={`${p.x}%`}
              y2={`${p.y}%`}
              stroke={`rgba(${color},0.3)`}
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
              transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </svg>
        {points.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ top: `${p.y}%`, left: `${p.x}%`, width: 4, height: 4, background: `rgba(${color},0.85)` }}
            animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      {particles.map((particle, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-[0.5px]"
          style={{
            top: `${particle.top}%`,
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            background: `rgba(${color},0.4)`,
          }}
          animate={{ y: [0, -22, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default FloatingParticles
