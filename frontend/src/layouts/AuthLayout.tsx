import { Outlet, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Boxes } from 'lucide-react'
import { APP_NAME } from '../constants/app'
import { ROUTES } from '../constants/routes'
import { AuthAgentProvider, useAuthAgent } from '../components/auth/AuthAgentContext'
import MissionAIScene from '../components/auth/MissionAIScene'
import AnimatedBackground from '../components/auth/AnimatedBackground'
import AnimatedLogo from '../components/auth/AnimatedLogo'
import { authService } from '../services/auth'

const FEATURES = [
  { emoji: '✨', text: 'Multi-Agent Collaboration' },
  { emoji: '🛡', text: 'Enterprise-Grade Security' },
  { emoji: '⚡', text: 'Real-Time Decision Intelligence' },
]

function AuthLayoutContent() {
  const { setCardHovered, prefersReducedMotion } = useAuthAgent()

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 lg:h-screen lg:overflow-hidden">
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-violet-700 px-14 py-9 text-white lg:flex">
        <AnimatedBackground />

        <Link to={ROUTES.landing} className="relative flex items-center gap-2">
          <AnimatedLogo />
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </Link>

        <div className="relative flex flex-1 items-center justify-center pt-3 pb-1">
          <MissionAIScene />
        </div>

        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Orchestrate every mission.</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            Four specialized AI agents, working in continuous sync to turn your data into decisions.
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {FEATURES.map(({ emoji, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-white/85">
                <span aria-hidden="true" className="inline-flex w-5 justify-center text-base">
                  {emoji}
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center px-6 py-8 lg:w-1/2">
        <div className="w-full max-w-sm lg:-translate-y-4">
          <Link to={ROUTES.landing} className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
              <Boxes className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{APP_NAME}</span>
          </Link>
          <motion.div
            className="relative animate-scale-in rounded-2xl border border-neutral-200 bg-white/90 p-9 shadow-card backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/90"
            onMouseEnter={() => setCardHovered(true)}
            onMouseLeave={() => setCardHovered(false)}
            whileHover={prefersReducedMotion ? undefined : { y: -2, boxShadow: '0 20px 40px -16px rgba(79,70,229,0.25)' }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function AuthLayout() {
  // Signed-in users shouldn't land back on Login/Register -- same check
  // ProtectedRoute uses for the inverse case, just reused here.
  if (authService.isAuthenticated()) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return (
    <AuthAgentProvider>
      <AuthLayoutContent />
    </AuthAgentProvider>
  )
}

export default AuthLayout
