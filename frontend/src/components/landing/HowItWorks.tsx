import {
  Briefcase,
  CheckCircle2,
  Crown,
  FileDown,
  LayoutDashboard,
  ShieldAlert,
  Target,
  UploadCloud,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

interface Step {
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: Step[] = [
  { icon: UploadCloud, title: 'Upload Dataset', description: 'Drop in a CSV, XLSX, or JSON file for any business mission.' },
  { icon: CheckCircle2, title: 'Validate Dataset', description: 'MissionOS profiles rows, columns, missing values, and duplicates automatically.' },
  { icon: Briefcase, title: 'Business Agent', description: 'Identifies the core business problem, opportunities, and key metrics.' },
  { icon: Target, title: 'Strategy Agent', description: 'Builds strategic objectives, initiatives, and a phased implementation roadmap.' },
  { icon: ShieldAlert, title: 'Risk Agent', description: 'Surfaces critical risks, severity, probability, and concrete mitigations.' },
  { icon: Crown, title: 'Executive Agent', description: 'Synthesizes every stage into one executive summary and final recommendation.' },
  { icon: LayoutDashboard, title: 'Executive Dashboard', description: 'KPIs, charts, and top risks/recommendations rendered instantly on screen.' },
  { icon: FileDown, title: 'Export PDF', description: 'A boardroom-ready HTML or PDF report, generated from the exact same data.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-50 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">
            How it Works
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            From raw data to executive decision
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            One pipeline, four specialized AI agents, zero manual analysis.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <div
            className="absolute top-0 bottom-0 left-6 w-px bg-gradient-to-b from-primary-300 via-violet-300 to-transparent sm:left-1/2 sm:-translate-x-1/2"
            aria-hidden="true"
          />
          <ol className="flex flex-col gap-10">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 70}>
                <li className="relative flex items-start gap-5 sm:justify-center">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-glow sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div
                    className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-glow sm:w-[calc(50%-2.5rem)] ${
                      index % 2 === 0 ? 'sm:mr-auto sm:text-right' : 'sm:ml-auto'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-neutral-900">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-neutral-600">{step.description}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
