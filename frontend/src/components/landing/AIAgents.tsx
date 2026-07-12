import { Briefcase, Crown, ShieldAlert, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

interface Agent {
  icon: LucideIcon
  name: string
  role: string
  contributes: string[]
  gradient: string
}

const AGENTS: Agent[] = [
  {
    icon: Briefcase,
    name: 'Business Agent',
    role: 'Understands the problem',
    contributes: ['Core business problem', 'Key opportunities', 'Important metrics', 'Recommended next steps'],
    gradient: 'from-sky-500 to-primary-600',
  },
  {
    icon: Target,
    name: 'Strategy Agent',
    role: 'Plans the response',
    contributes: ['Strategic objectives', 'Recommended initiatives', 'Phased implementation roadmap', 'KPIs to track'],
    gradient: 'from-primary-600 to-violet-600',
  },
  {
    icon: ShieldAlert,
    name: 'Risk Agent',
    role: 'Stress-tests the plan',
    contributes: ['Critical risks by severity', 'Assumptions made explicit', 'Recommended mitigations', 'Overall risk level'],
    gradient: 'from-violet-600 to-fuchsia-600',
  },
  {
    icon: Crown,
    name: 'Executive Agent',
    role: 'Synthesizes the decision',
    contributes: ['Executive summary', 'Key findings', 'Trade-offs to weigh', 'Final recommendation'],
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
            Each agent has one job, builds on the last agent's output, and never re-does the previous
            stage's reasoning.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((agent, index) => (
            <Reveal key={agent.name} delayMs={index * 80}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow">
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
                <ul className="relative mt-4 flex flex-col gap-2">
                  {agent.contributes.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-neutral-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AIAgents
