import {
  Activity,
  BarChart3,
  Boxes,
  Briefcase,
  ClipboardList,
  Database,
  FileDown,
  GitBranch,
  Handshake,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Lock,
  Moon,
  Network,
  PieChart,
  Quote,
  Radar,
  Rocket,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from './Reveal'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

// Every feature below is a real, shipped capability -- traceable to an
// actual page or component in the app, not an aspirational roadmap item.
const FEATURES: Feature[] = [
  { icon: Boxes, title: 'Mission Management', description: 'Create, edit, and track missions through their full lifecycle.' },
  { icon: Database, title: 'Dataset Management', description: 'Upload, validate, re-index, and delete datasets per mission.' },
  { icon: Activity, title: 'Automatic Profiling', description: 'Row/column counts, missing values, and duplicates, computed on upload.' },
  { icon: Layers, title: 'RAG Retrieval', description: 'Every agent grounds its output in chunks retrieved from your own data.' },
  { icon: Sparkles, title: 'Vector Search', description: 'OpenAI embeddings indexed in ChromaDB for fast semantic similarity search.' },
  { icon: Lightbulb, title: 'Explainability Engine', description: 'Every recommendation traces to its agent, reasoning, and supporting evidence.' },
  { icon: LayoutDashboard, title: 'Executive Dashboard', description: 'KPI scorecards, gauges, and charts the moment analysis completes.' },
  { icon: GitBranch, title: 'Scenario Simulator', description: 'Deterministic what-if projections against 14 adjustable business parameters.' },
  { icon: Network, title: 'AI Collaboration Center', description: 'Watch the four agents\' confidence, evidence, and consensus side by side.' },
  { icon: BarChart3, title: 'Business Intelligence', description: 'Waterfall, category, and distribution charts built from real analysis output.' },
  { icon: GitBranch, title: 'Decision Trace', description: 'Dataset → chunks → embeddings → retrieval → agents, visualized end to end.' },
  { icon: Quote, title: 'Evidence Tracking', description: 'Retrieved evidence is cited, numbered, and attached to every agent output.' },
  { icon: Handshake, title: 'Agent Consensus', description: 'Agreement across agents derived from how closely their confidence scores align.' },
  { icon: ClipboardList, title: 'Executive Reporting', description: 'A print-ready report mirroring the dashboard, generated from real data.' },
  { icon: Rocket, title: 'Deployment Readiness', description: 'A transparent formula over confidence and risk, not a black-box score.' },
  { icon: ShieldAlert, title: 'Risk Analytics', description: 'Critical risks broken down by severity, category, probability, and impact.' },
  { icon: TrendingUp, title: 'Business Impact Analysis', description: 'A waterfall of how the recommendation set builds up across agents.' },
  { icon: Target, title: 'Mission Timeline', description: 'Every stage from mission creation to report generation, timestamped.' },
  { icon: Sparkles, title: 'Confidence Analytics', description: 'Per-agent and overall AI confidence, tracked across the pipeline.' },
  { icon: PieChart, title: 'Knowledge Contribution', description: 'Each agent\'s share of the evidence citations behind the final decision.' },
  { icon: Briefcase, title: 'Recommendation Engine', description: 'Every recommendation stays linked to the agent and evidence that produced it.' },
  { icon: Radar, title: 'Evidence Coverage', description: 'How many agents grounded their output in retrieved evidence, at a glance.' },
  { icon: BarChart3, title: 'Interactive Charts', description: 'Gauges, donuts, waterfalls, and radars — the same components across every page.' },
  { icon: FileDown, title: 'Report Export', description: 'One click prints the Executive Report to PDF, or exports HTML/PDF from the backend.' },
  { icon: Moon, title: 'Dark Mode', description: 'Every page, chart, and component is fully theme-aware, system or manual.' },
  { icon: Smartphone, title: 'Responsive Design', description: 'Desktop, tablet, and mobile — no clipped cards, no broken layouts.' },
  { icon: Lock, title: 'Enterprise Security', description: 'Token-based authentication and owner-scoped data access on every request.' },
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

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delayMs={index * 25}>
              <div className="group h-full rounded-xl border border-neutral-200 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-glow">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-50 to-violet-50 text-primary-600 transition-colors duration-300 group-hover:from-primary-600 group-hover:to-violet-600 group-hover:text-white">
                  <feature.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3.5 text-sm font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
