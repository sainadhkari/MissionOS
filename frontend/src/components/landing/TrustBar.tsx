import { Boxes, Container, Database, Layers, Network, Sparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

const TECHNOLOGIES: { name: string; icon: LucideIcon }[] = [
  { name: 'React', icon: Zap },
  { name: 'FastAPI', icon: Boxes },
  { name: 'OpenAI', icon: Sparkles },
  { name: 'CrewAI', icon: Network },
  { name: 'LangChain', icon: Layers },
  { name: 'PostgreSQL', icon: Database },
  { name: 'Docker', icon: Container },
]

function TrustBar() {
  return (
    <section className="border-y border-neutral-200 bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
            Built on a modern, production-grade stack
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TECHNOLOGIES.map(({ name, icon: Icon }) => (
              <span
                key={name}
                className="flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default TrustBar
