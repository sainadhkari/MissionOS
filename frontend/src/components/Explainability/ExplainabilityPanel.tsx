import { Lightbulb, Workflow } from 'lucide-react'
import Card from '../Card'
import EmptyState from '../EmptyState'
import ExplainabilityCard from './ExplainabilityCard'
import AIDecisionTrace from './AIDecisionTrace'
import { buildDecisionTraceStages, buildExplainabilityCards } from '../../utils/explainability'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'

interface ExplainabilityPanelProps {
  analysis: MissionAnalysis | null
  datasets: Dataset[]
  className?: string
}

/** Renders the "why" behind every AI recommendation — which agent
 * produced it, what evidence backs it, and how it traces back through the
 * RAG pipeline. Pure presentational component fed entirely from data the
 * app already fetches elsewhere (`MissionAnalysis` + `Dataset[]`); it never
 * issues its own requests, so it drops into any page that already has that
 * data in scope. */
function ExplainabilityPanel({ analysis, datasets, className = '' }: ExplainabilityPanelProps) {
  const isReady =
    analysis?.status === 'completed' &&
    analysis.business_analysis &&
    analysis.strategy_analysis &&
    analysis.risk_analysis &&
    analysis.executive_analysis

  if (!isReady) {
    return (
      <Card className={className}>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Lightbulb className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          Explainability
        </h2>
        <EmptyState
          icon={Lightbulb}
          title="Explainability data will appear once analysis completes"
          description="Run AI analysis on this mission to see why each recommendation was made, which agent produced it, and what evidence supports it."
        />
      </Card>
    )
  }

  const cards = buildExplainabilityCards(analysis)
  const stages = buildDecisionTraceStages(datasets, analysis)

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Workflow className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          AI Decision Trace
        </h2>
        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          How this mission's data flowed from raw datasets through retrieval and each AI agent to the final
          recommendation.
        </p>
        <AIDecisionTrace stages={stages} />
      </Card>

      <Card>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Lightbulb className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          Explainability
        </h2>
        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          {cards.length} AI-generated recommendation{cards.length === 1 ? '' : 's'}, each traced back to the agent
          that produced it and the evidence that supports it. Expand a card for the full breakdown.
        </p>
        {cards.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No recommendations to explain yet" />
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((card) => (
              <ExplainabilityCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default ExplainabilityPanel
