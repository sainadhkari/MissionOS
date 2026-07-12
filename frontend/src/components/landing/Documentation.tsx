import { BookOpen, ClipboardList, GitBranch, LayoutDashboard, Lightbulb, Quote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

interface DocTopic {
  icon: LucideIcon
  title: string
  description: string
}

const TOPICS: DocTopic[] = [
  {
    icon: Lightbulb,
    title: 'Explainability',
    description: 'How every recommendation traces back to the agent, reasoning, and confidence behind it.',
  },
  {
    icon: Quote,
    title: 'Evidence',
    description: 'How retrieved evidence is cited, numbered, and scored by similarity in every agent output.',
  },
  {
    icon: GitBranch,
    title: 'Decision Trace',
    description: 'The full path from raw dataset to final recommendation — chunks, embeddings, retrieval, agents.',
  },
  {
    icon: ClipboardList,
    title: 'Executive Report',
    description: 'What each section of the print-ready report shows, and where its data comes from.',
  },
  {
    icon: LayoutDashboard,
    title: 'Agent Pipeline',
    description: 'How the Business, Strategy, Risk, and Executive agents hand off work to one another.',
  },
  {
    icon: BookOpen,
    title: 'Mission Timeline',
    description: 'Every stage from mission creation to report generation, and how it\'s timestamped.',
  },
]

function Documentation() {
  return (
    <section id="documentation" className="bg-neutral-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary-600">Documentation</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            How MissionOS explains its own decisions
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            These aren't roadmap items — every concept below is a working part of the platform today.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic, index) => (
            <Reveal key={topic.title} delayMs={index * 60}>
              <div className="group h-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-glow">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-50 to-violet-50 text-primary-600 transition-colors duration-300 group-hover:from-primary-600 group-hover:to-violet-600 group-hover:text-white">
                  <topic.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-neutral-900">{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{topic.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Documentation
