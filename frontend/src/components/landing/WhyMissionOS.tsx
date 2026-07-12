import { Check, X } from 'lucide-react'
import Reveal from './Reveal'

const COMPARISONS: { traditional: string; missionos: string }[] = [
  { traditional: 'Black-box AI output', missionos: 'Explainable AI, traced to evidence' },
  { traditional: '"Trust the model"', missionos: 'Transparent, evidence-backed recommendations' },
  { traditional: 'A single analyst\'s take', missionos: 'Multi-agent collaboration and consensus' },
  { traditional: 'Static dashboards', missionos: 'Interactive business analytics' },
  { traditional: 'Answers ungrounded in your data', missionos: 'RAG-grounded in your own datasets' },
  { traditional: 'One what-if, run by hand', missionos: 'Scenario planning with 14 adjustable parameters' },
  { traditional: 'Manual slide decks', missionos: 'One-click executive reporting' },
  { traditional: 'Hackathon-grade prototypes', missionos: 'Production-ready architecture' },
  { traditional: 'Hours of manual analysis', missionos: 'Minutes, end to end' },
]

function WhyMissionOS() {
  return (
    <section className="bg-neutral-50 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">
            Why MissionOS
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Analytics teams shouldn't be the bottleneck
          </h2>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="mt-14 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
            <div className="grid grid-cols-2">
              <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
                <span className="text-sm font-semibold text-neutral-500">Traditional Analytics</span>
              </div>
              <div className="border-b border-neutral-200 bg-gradient-to-r from-primary-50 to-violet-50 px-6 py-4">
                <span className="text-sm font-semibold text-primary-700">MissionOS</span>
              </div>
            </div>
            {COMPARISONS.map((row, index) => (
              <div key={row.traditional} className={`grid grid-cols-2 ${index !== COMPARISONS.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                <div className="flex items-center gap-2.5 px-6 py-4">
                  <X className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden="true" />
                  <span className="text-sm text-neutral-500">{row.traditional}</span>
                </div>
                <div className="flex items-center gap-2.5 bg-primary-50/40 px-6 py-4">
                  <Check className="h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-neutral-900">{row.missionos}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default WhyMissionOS
