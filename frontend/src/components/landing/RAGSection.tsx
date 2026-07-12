import { Database, Layers, Quote, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

const RAG_ITEMS: { icon: LucideIcon; label: string }[] = [
  { icon: Database, label: 'Upload Datasets' },
  { icon: Layers, label: 'Chunk & Embed' },
  { icon: Sparkles, label: 'ChromaDB Retrieval' },
  { icon: Quote, label: 'Cited Evidence' },
]

function RAGSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-primary-950 to-neutral-900 py-24 text-white sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.25),transparent_50%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-200">
            Live in every mission
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Every answer grounded in your own data
          </h2>
          <p className="mt-4 text-lg text-neutral-300">
            MissionOS chunks and embeds every dataset you upload, indexes it in ChromaDB, and retrieves
            the most relevant evidence for each agent to reason over — with citations, not guesses.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {RAG_ITEMS.map((item, index) => (
            <Reveal key={item.label} delayMs={index * 70}>
              <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm transition-colors duration-300 hover:border-violet-400/40 hover:bg-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary-500 text-white">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-neutral-200">{item.label}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={280}>
          <div className="mx-auto mt-10 flex max-w-xl items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <Quote className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden="true" />
            <p className="text-sm text-neutral-300">
              Every recommendation in the Explainability Center and Executive Report cites the exact
              retrieved chunk it was grounded in — numbered, with a similarity score and source dataset
              attached.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default RAGSection
