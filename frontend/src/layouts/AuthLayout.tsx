import { Outlet, Link } from 'react-router-dom'
import { Boxes, FlaskConical, Layers, Lightbulb, Sparkles } from 'lucide-react'
import { APP_NAME } from '../constants/app'
import { ROUTES } from '../constants/routes'

const FEATURES = [
  { icon: Sparkles, text: 'Business, Strategy, Risk, and Executive AI agents collaborate on every mission' },
  { icon: Layers, text: 'RAG-grounded evidence — every recommendation traces back to a cited source' },
  { icon: Lightbulb, text: 'Full explainability: decision trace, confidence scores, evidence coverage' },
  { icon: FlaskConical, text: 'Scenario simulation and executive reporting built for real decisions' },
]

function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-violet-700 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-blob rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 animate-blob rounded-full bg-violet-400/20 blur-3xl [animation-delay:2s]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/3 top-1/2 h-48 w-48 animate-float rounded-full bg-primary-300/10 blur-3xl"
          aria-hidden="true"
        />

        <Link to={ROUTES.landing} className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </Link>

        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Enterprise AI decision intelligence, in minutes.
          </h2>
          <p className="mt-3 max-w-md text-sm text-white/70">
            Upload your data and let a multi-agent AI pipeline deliver RAG-grounded, explainable strategy,
            risk, and executive analysis — with scenario simulation and enterprise-ready reports.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">Multi-Agent AI · RAG-Grounded · Explainable · Enterprise Reporting</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link to={ROUTES.landing} className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
              <Boxes className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{APP_NAME}</span>
          </Link>
          <div className="animate-scale-in rounded-2xl border border-neutral-200 bg-white p-8 shadow-card dark:border-neutral-800 dark:bg-neutral-900">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
