import {
  Boxes,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Crown,
  Database,
  FileSearch,
  GitBranch,
  Handshake,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Network,
  Scissors,
  ShieldAlert,
  Sparkles,
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

// The real, current end-to-end pipeline -- every stage here corresponds to
// a step MissionOS actually executes (dataset validation, RAG indexing,
// the four-agent sequence in its real order, then the executive-facing
// surfaces), not an illustrative simplification.
const STEPS: Step[] = [
  { icon: Boxes, title: 'Create Mission', description: 'Define the business domain, priority, and problem statement for a new mission.' },
  { icon: UploadCloud, title: 'Upload Dataset', description: 'Drop in a CSV, XLSX, or JSON file for the mission.' },
  { icon: CheckCircle2, title: 'Automatic Validation', description: 'MissionOS checks encoding, structure, and file integrity as soon as it lands.' },
  { icon: FileSearch, title: 'Profiling', description: 'Row and column counts, missing values, duplicates, and column types are profiled automatically.' },
  { icon: Scissors, title: 'Chunking', description: 'The dataset is split into retrieval-sized text chunks for the knowledge base.' },
  { icon: Sparkles, title: 'Embedding Generation', description: 'Each chunk is embedded with OpenAI embeddings for semantic search.' },
  { icon: Database, title: 'Vector Database', description: 'Embeddings are persisted in ChromaDB, scoped to the mission.' },
  { icon: Layers, title: 'RAG Retrieval', description: 'The most relevant chunks are retrieved by similarity for the agents to reason over.' },
  { icon: Briefcase, title: 'Business Agent', description: 'Identifies the core business problem, opportunities, and key metrics.' },
  { icon: Target, title: 'Strategy Agent', description: 'Builds strategic objectives, initiatives, and a phased implementation roadmap.' },
  { icon: ShieldAlert, title: 'Risk Agent', description: 'Surfaces critical risks, severity, probability, and concrete mitigations.' },
  { icon: Crown, title: 'Executive Agent', description: 'Synthesizes every stage into one executive summary and final recommendation.' },
  { icon: Network, title: 'Agent Collaboration', description: 'Each agent\'s confidence, evidence, and reasoning are laid out side by side.' },
  { icon: Handshake, title: 'Consensus Building', description: 'Agreement across agents and overall decision strength are derived from their confidence scores.' },
  { icon: LayoutDashboard, title: 'Executive Dashboard', description: 'KPIs, gauges, and interactive charts render the moment analysis completes.' },
  { icon: Lightbulb, title: 'Explainability', description: 'Every recommendation traces back to the agent, evidence, and reasoning behind it.' },
  { icon: GitBranch, title: 'Scenario Simulation', description: 'Run deterministic what-if projections against the mission\'s real analysis.' },
  { icon: ClipboardList, title: 'Executive Report', description: 'A print-ready report mirroring the dashboard, generated from the exact same data.' },
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
            One pipeline, four specialized AI agents, and a RAG knowledge base grounding every step —
            zero manual analysis.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <div
            className="absolute top-0 bottom-0 left-6 w-px bg-gradient-to-b from-primary-300 via-violet-300 to-transparent sm:left-1/2 sm:-translate-x-1/2"
            aria-hidden="true"
          />
          <ol className="flex flex-col gap-10">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delayMs={index * 50}>
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
