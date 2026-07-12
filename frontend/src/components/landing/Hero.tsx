import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import { useState } from 'react'
import { ROUTES } from '../../constants/routes'

function Hero() {
  const [showDemoNotice, setShowDemoNotice] = useState(false)

  return (
    <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Decorative gradient blobs -- purely visual, aria-hidden */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 h-96 w-96 animate-blob rounded-full bg-primary-200/50 blur-3xl" />
        <div className="absolute top-40 -right-24 h-96 w-96 animate-blob rounded-full bg-violet-200/50 blur-3xl [animation-delay:4s]" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 animate-blob rounded-full bg-sky-200/40 blur-3xl [animation-delay:8s]" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            Enterprise AI Decision Intelligence
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-primary-600 via-violet-600 to-primary-600 bg-clip-text text-transparent">
              MissionOS
            </span>
            <span className="mt-2 block text-neutral-900">
              Enterprise AI Decision
              <br />
              Intelligence Platform
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-600">
            A multi-agent AI platform that turns raw business data into executive-ready decisions —
            grounded in retrieved evidence, fully explainable, stress-tested through scenario simulation,
            and delivered as a boardroom-ready report.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to={ROUTES.register}
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to={ROUTES.login}
              className="rounded-lg border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-400 hover:bg-neutral-50"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={() => setShowDemoNotice(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:text-neutral-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white transition-colors group-hover:border-primary-400">
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </span>
              Watch Demo
            </button>
          </div>
          {showDemoNotice && (
            <p className="mt-3 text-sm text-neutral-500">
              The demo video is coming soon — in the meantime,{' '}
              <Link to={ROUTES.register} className="font-medium text-primary-600 hover:text-primary-700">
                create a free account
              </Link>{' '}
              to explore MissionOS yourself.
            </p>
          )}

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-neutral-200 pt-8">
            <div>
              <dt className="text-2xl font-bold text-neutral-900">4</dt>
              <dd className="text-sm text-neutral-500">Specialized AI Agents</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-neutral-900">25+</dt>
              <dd className="text-sm text-neutral-500">Executive Analytics</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold text-neutral-900">100%</dt>
              <dd className="text-sm text-neutral-500">Evidence-Traced</dd>
            </div>
          </dl>
        </div>

        <div className="relative animate-fade-in-up [animation-delay:200ms] [animation-fill-mode:backwards]">
          <div
            className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary-500/20 to-violet-500/20 blur-2xl"
            aria-hidden="true"
          />

          {/* Main card -- Executive Dashboard */}
          <div className="relative z-20 animate-float overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-glow">
            <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 truncate rounded-md bg-white px-2.5 py-1 text-xs text-neutral-400 shadow-xs">
                app.missionos.ai/executive-dashboard
              </span>
            </div>
            <img
              src="/screenshots/executive-dashboard.png"
              alt="MissionOS Executive Dashboard with KPI scorecards, confidence gauges, and business intelligence charts"
              className="block w-full"
              width={1280}
              height={800}
            />
          </div>

          {/* Accent card -- AI Collaboration Center, peeking from behind top-right */}
          <div
            className="absolute -top-10 -right-10 z-10 hidden w-64 animate-float overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-glow [animation-delay:1.2s] sm:block"
            aria-hidden="true"
          >
            <div className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            </div>
            <img src="/screenshots/ai-collaboration-center.png" alt="" className="block w-full" width={640} height={400} />
          </div>

          {/* Accent card -- Explainability, peeking from behind bottom-left */}
          <div
            className="absolute -bottom-10 -left-10 z-10 hidden w-56 animate-float overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-glow [animation-delay:2.4s] md:block"
            aria-hidden="true"
          >
            <div className="flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            </div>
            <img src="/screenshots/explainability.png" alt="" className="block w-full" width={560} height={350} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
