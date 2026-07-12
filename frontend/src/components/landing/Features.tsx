import { BarChart3, Bot, FileText, LayoutDashboard, Lock, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  comingSoon?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: Bot,
    title: 'Multi-Agent AI',
    description:
      'Four specialized agents — Business, Strategy, Risk, and Executive — reason over your mission in sequence, each building on the last.',
  },
  {
    icon: LayoutDashboard,
    title: 'Executive Dashboard',
    description:
      'KPI tiles, confidence scores, and risk levels rendered the moment analysis completes — no waiting on a data team.',
  },
  {
    icon: BarChart3,
    title: 'Interactive Analytics',
    description:
      'Business breakdowns, risk categories, and dataset quality visualized with real charts, not static screenshots.',
  },
  {
    icon: FileText,
    title: 'Executive Reports',
    description:
      'One click exports a boardroom-ready HTML or PDF report — cover page, KPIs, roadmap, and full risk register included.',
  },
  {
    icon: Sparkles,
    title: 'RAG Knowledge Base',
    description:
      'Ground every analysis in your own policies and annual reports, with the model citing exactly where an answer came from.',
    comingSoon: true,
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description:
      'Token-based authentication, owner-scoped data access, and hardened production defaults on every deployment.',
  },
]

function Features() {
  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">Features</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Everything an executive team needs
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Built for teams who need answers, not another dashboard to maintain.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 60}>
              <div className="group h-full rounded-2xl border border-neutral-200 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary-200 hover:shadow-glow">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-violet-50 text-primary-600 transition-colors duration-300 group-hover:from-primary-600 group-hover:to-violet-600 group-hover:text-white">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {feature.comingSoon && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
