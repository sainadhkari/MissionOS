import { motion, useReducedMotion } from 'framer-motion'
import FloatingParticles from './FloatingParticles'

const STARS = [
  { top: '12%', left: '38%', size: 2 },
  { top: '22%', left: '62%', size: 1.5 },
  { top: '36%', left: '18%', size: 2 },
  { top: '58%', left: '52%', size: 1.5 },
  { top: '68%', left: '28%', size: 2 },
  { top: '80%', left: '58%', size: 1.5 },
  { top: '46%', left: '82%', size: 2 },
]

const NOISE_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

function AnimatedBackground() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -right-24 -top-24 h-72 w-72 animate-blob rounded-full bg-white/[0.07] blur-3xl" />
      <div className="absolute -bottom-32 -left-16 h-80 w-80 animate-blob rounded-full bg-violet-400/[0.14] blur-3xl [animation-delay:2s]" />
      <div className="absolute left-1/3 top-1/2 h-48 w-48 animate-float rounded-full bg-primary-300/[0.06] blur-3xl" />

      {/* spotlight: brightens the area behind the AI scene for depth */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(46% 42% at 50% 42%, rgba(255,255,255,0.12), transparent 72%)' }}
      />

      {/* aurora mesh layers */}
      <motion.div
        className="absolute -inset-1/4 opacity-[0.12]"
        style={{ background: 'conic-gradient(from 90deg at 50% 40%, rgba(196,181,253,0.5), rgba(129,140,248,0.2), rgba(255,255,255,0.3), rgba(196,181,253,0.5))' }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute -inset-1/4 opacity-[0.1]"
        style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.5), transparent 60%)' }}
        animate={reduceMotion ? undefined : { x: ['-5%', '5%', '-5%'], y: ['-3%', '4%', '-3%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* subtle stars */}
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white/50"
          style={{ top: star.top, left: star.left, width: star.size, height: star.size }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: NOISE_BACKGROUND }}
      />

      <FloatingParticles mode="ambient" count={8} color="255,255,255" />

      {/* vignette: darkens the outer edges for depth */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 120% at 50% 45%, transparent 48%, rgba(4,3,12,0.4) 100%)' }}
      />
    </div>
  )
}

export default AnimatedBackground
