import { Briefcase, Crown, ShieldAlert, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

interface Agent {
  icon: LucideIcon
  name: string
  role: string
  responsibilities: string
  inputs: string
  outputs: string
  evidence: string
  confidence: string
  businessValue: string
  gradient: string
}

const AGENTS: Agent[] = [
  {
    icon: Briefcase,
    name: 'Business Agent',
    role: 'Understands the problem',
    responsibilities: 'Frames the core business problem and surfaces the opportunities worth acting on.',
    inputs: 'Mission brief + retrieved dataset evidence',
    outputs: 'Business problem, key opportunities, important metrics, next steps',
    evidence: 'Cites retrieved chunks that ground its assessment',
    confidence: 'Scored independently, shown on every card',
    businessValue: 'Turns raw data into a clear statement of what\'s actually at stake',
    gradient: 'from-sky-500 to-primary-600',
  },
  {
    icon: Target,
    name: 'Strategy Agent',
    role: 'Plans the response',
    responsibilities: 'Builds on the Business Agent\'s findings to define objectives and a phased plan.',
    inputs: 'Business Agent output + retrieved evidence',
    outputs: 'Strategic objectives, initiatives, roadmap, KPIs, business impact',
    evidence: 'Cites the chunks supporting each initiative',
    confidence: 'Scored independently, shown on every card',
    businessValue: 'Converts a business problem into a concrete, sequenced plan',
    gradient: 'from-primary-600 to-violet-600',
  },
  {
    icon: ShieldAlert,
    name: 'Risk Agent',
    role: 'Stress-tests the plan',
    responsibilities: 'Reviews the strategy for what could go wrong and how severe it would be.',
    inputs: 'Business + Strategy Agent output + retrieved evidence',
    outputs: 'Critical risks, severity, probability, mitigations, overall risk level',
    evidence: 'Cites the chunks each identified risk is grounded in',
    confidence: 'Scored independently, shown on every card',
    businessValue: 'Surfaces blockers before they become surprises in execution',
    gradient: 'from-violet-600 to-fuchsia-600',
  },
  {
    icon: Crown,
    name: 'Executive Agent',
    role: 'Synthesizes the decision',
    responsibilities: 'Weighs the first three agents\' output into a single recommendation.',
    inputs: 'Business + Strategy + Risk Agent output + retrieved evidence',
    outputs: 'Executive summary, key findings, trade-offs, final recommendation',
    evidence: 'Cites the chunks behind the final recommendation',
    confidence: 'Scored independently, shown on every card',
    businessValue: 'Gives leadership one clear answer instead of three separate reports',
    gradient: 'from-fuchsia-600 to-rose-500',
  },
]

function AIAgents() {
  return (
    <section id="ai-agents" className="bg-neutral-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">AI Agents</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Four agents. One mission pipeline.
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Each agent has one job, builds on the last agent's output, and grounds everything it says in
            retrieved evidence.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {AGENTS.map((agent, index) => (
            <Reveal key={agent.name} delayMs={index * 80}>
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow">
                <div
                  className={`absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${agent.gradient} opacity-10 transition-transform duration-500 group-hover:scale-150`}
                  aria-hidden="true"
                />
                <span
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${agent.gradient} text-white shadow-glow`}
                >
                  <agent.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="relative mt-5 text-base font-semibold text-neutral-900">{agent.name}</h3>
                <p className="relative mt-0.5 text-xs font-medium text-primary-600">{agent.role}</p>

                <dl className="relative mt-4 flex flex-1 flex-col gap-3 text-xs">
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-neutral-400">Responsibilities</dt>
                    <dd className="mt-0.5 text-neutral-600">{agent.responsibilities}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-neutral-400">Inputs</dt>
                    <dd className="mt-0.5 text-neutral-600">{agent.inputs}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-neutral-400">Outputs</dt>
                    <dd className="mt-0.5 text-neutral-600">{agent.outputs}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-neutral-400">Evidence Used</dt>
                    <dd className="mt-0.5 text-neutral-600">{agent.evidence}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-wide text-neutral-400">Confidence</dt>
                    <dd className="mt-0.5 text-neutral-600">{agent.confidence}</dd>
                  </div>
                  <div className="mt-auto rounded-lg bg-neutral-50 p-2.5">
                    <dt className="font-semibold uppercase tracking-wide text-neutral-400">Business Value</dt>
                    <dd className="mt-0.5 font-medium text-neutral-800">{agent.businessValue}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AIAgents
