import { Briefcase, Clock, GitBranch, ListOrdered, Quote, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import Badge from '../Badge'
import { confidenceBadgeVariant, confidenceLabel } from '../../utils/executiveDashboard'
import type { AgentBoardCard, AgentName } from '../../utils/collaborationCenter'

const AGENT_ICONS: Record<AgentName, LucideIcon> = {
  Business: Briefcase,
  Strategy: Target,
  Risk: ShieldAlert,
  Executive: Sparkles,
}

function StatRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      {value ? (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
      ) : (
        <span className="italic text-neutral-400 dark:text-neutral-600">Not Available</span>
      )}
    </div>
  )
}

interface AgentCollaborationBoardProps {
  cards: AgentBoardCard[]
}

function AgentCollaborationBoard({ cards }: AgentCollaborationBoardProps) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Agent Collaboration Board</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          What each agent produced, how confident it was, and the evidence it grounded its work in.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = AGENT_ICONS[card.agentName]
          const isComplete = card.status === 'Complete'
          return (
            <Card
              key={card.agentName}
              className="flex flex-col gap-4 transition-shadow duration-300 hover:shadow-dropdown"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {card.agentName} Agent
                  </span>
                </span>
                <Badge variant={isComplete ? 'success' : 'neutral'}>{card.status}</Badge>
              </div>

              {card.confidencePercent !== null ? (
                <Badge variant={confidenceBadgeVariant(card.confidencePercent / 100)} className="w-fit">
                  {card.confidencePercent}% {confidenceLabel(card.confidencePercent / 100)}
                </Badge>
              ) : (
                <Badge variant="neutral" className="w-fit border border-dashed border-neutral-300 dark:border-neutral-700">
                  Not Available
                </Badge>
              )}

              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  Reasoning Summary
                </h4>
                <p className="mt-1 line-clamp-4 text-xs text-neutral-600 dark:text-neutral-400">
                  {card.reasoningSummary ?? 'Not Available'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/40">
                <StatRow label="Evidence Used" value={card.evidenceCount !== null ? String(card.evidenceCount) : null} />
                <StatRow label="Retrieved Chunks" value={card.chunksRetrieved !== null ? String(card.chunksRetrieved) : null} />
                <StatRow label="Business Impact" value={card.businessImpact} />
                <StatRow
                  label="Recommendations"
                  value={card.recommendationsCount !== null ? String(card.recommendationsCount) : null}
                />
                <StatRow label="Risks Generated" value={card.risksCount !== null ? String(card.risksCount) : null} />
              </div>

              <div>
                <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  <Quote className="h-3 w-3" aria-hidden="true" />
                  Supporting Evidence
                </h4>
                {card.supportingEvidence.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {card.supportingEvidence.slice(0, 2).map((item, index) => (
                      <li
                        key={index}
                        className="truncate rounded border-l-2 border-primary-300 bg-neutral-900 px-2 py-1 font-mono text-[11px] text-neutral-100 dark:border-primary-700 dark:bg-black/40"
                        title={item}
                      >
                        [{index + 1}] {item}
                      </li>
                    ))}
                    {card.supportingEvidence.length > 2 && (
                      <li className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        +{card.supportingEvidence.length - 2} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs italic text-neutral-400 dark:text-neutral-600">Not Available</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 border-t border-neutral-200 pt-3 text-xs dark:border-neutral-800">
                <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                  <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                  Execution Order: #{card.executionOrder}
                </span>
                <span className="flex items-start gap-1.5 text-neutral-500 dark:text-neutral-400">
                  <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Depends on: {card.dependencies.length > 0 ? card.dependencies.join(', ') : 'None'}
                </span>
                <span className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Execution Time: {card.executionTime ?? 'Not Available'}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export default AgentCollaborationBoard
