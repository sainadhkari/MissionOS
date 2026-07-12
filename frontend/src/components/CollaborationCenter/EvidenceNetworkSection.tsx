import { ArrowDown, Briefcase, Database, Layers, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import Badge from '../Badge'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'
import type { AgentName } from '../../utils/collaborationCenter'

const AGENT_ICONS: Record<AgentName, LucideIcon> = {
  Business: Briefcase,
  Strategy: Target,
  Risk: ShieldAlert,
  Executive: Sparkles,
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-4 w-4 text-neutral-300 dark:text-neutral-700" aria-hidden="true" />
    </div>
  )
}

interface EvidenceNetworkSectionProps {
  analysis: MissionAnalysis | null
  datasets: Dataset[]
}

/** A flow visualization of the same real retrieval + evidence data shown
 * elsewhere (Explainability, Executive Dashboard) — reframed here as a
 * network from raw datasets down to the final decision, since this page's
 * job is to make that flow visible end-to-end in one place. */
function EvidenceNetworkSection({ analysis, datasets }: EvidenceNetworkSectionProps) {
  const retrieval = analysis?.retrieval_stats ?? null
  const agents: { name: AgentName; output: { evidence_used: string[]; confidence: number } | null }[] = [
    { name: 'Business', output: analysis?.business_analysis ?? null },
    { name: 'Strategy', output: analysis?.strategy_analysis ?? null },
    { name: 'Risk', output: analysis?.risk_analysis ?? null },
    { name: 'Executive', output: analysis?.executive_analysis ?? null },
  ]

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Evidence Network</h2>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        Datasets → Retrieved Evidence → Business → Strategy → Risk → Executive → Final Decision.
      </p>

      <div className="mx-auto flex max-w-lg flex-col">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            Datasets ({datasets.length})
          </p>
          {datasets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {datasets.map((dataset) => (
                <span
                  key={dataset.id}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-neutral-700 shadow-xs dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {dataset.original_filename}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-neutral-400 dark:text-neutral-600">Not Available</p>
          )}
        </div>

        <Connector />

        <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900 dark:bg-primary-950/30">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Retrieved Evidence
          </p>
          {retrieval ? (
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="primary">{retrieval.chunks_retrieved} chunks</Badge>
              <Badge variant="info">
                {retrieval.average_similarity_score !== null
                  ? `${Math.round(retrieval.average_similarity_score * 100)}% avg. similarity`
                  : 'Similarity: Not Available'}
              </Badge>
              <Badge variant="neutral">{retrieval.embedding_model}</Badge>
              <Badge variant="neutral">{retrieval.vector_store}</Badge>
            </div>
          ) : (
            <p className="text-xs italic text-neutral-400 dark:text-neutral-600">Not Available</p>
          )}
        </div>

        <Connector />

        <div className="grid grid-cols-2 gap-3">
          {agents.map(({ name, output }) => {
            const Icon = AGENT_ICONS[name]
            return (
              <div
                key={name}
                className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <Icon className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
                  {name}
                </p>
                {output ? (
                  <Badge variant="success" className="mt-1.5">
                    {output.evidence_used.length} citation{output.evidence_used.length === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="mt-1.5">
                    Not Available
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        <Connector />

        <div className="rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 p-4 text-white shadow-glow">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/70">Final Decision</p>
          <p className="text-sm font-medium">
            {analysis?.executive_analysis?.final_recommendation ?? 'Not Available'}
          </p>
        </div>
      </div>
    </Card>
  )
}

export default EvidenceNetworkSection
