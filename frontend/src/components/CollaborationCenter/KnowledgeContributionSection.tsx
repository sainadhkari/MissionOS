import { Briefcase, PieChart as PieChartIcon, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import EmptyState from '../EmptyState'
import AnimatedCounter from '../AnimatedCounter'
import type { AgentName, KnowledgeContributionEntry } from '../../utils/collaborationCenter'

const AGENT_ICONS: Record<AgentName, LucideIcon> = {
  Business: Briefcase,
  Strategy: Target,
  Risk: ShieldAlert,
  Executive: Sparkles,
}

const AGENT_BAR_COLOR: Record<AgentName, string> = {
  Business: 'bg-primary-500',
  Strategy: 'bg-info-500',
  Risk: 'bg-warning-500',
  Executive: 'bg-success-500',
}

interface KnowledgeContributionSectionProps {
  contributions: KnowledgeContributionEntry[]
}

/** Each agent's share of the total evidence citations used across the
 * mission — see `buildKnowledgeContribution` for the exact real-data
 * derivation. Falls back to "Not Available" per agent rather than an
 * invented even split when no evidence was cited at all. */
function KnowledgeContributionSection({ contributions }: KnowledgeContributionSectionProps) {
  const allUnavailable = contributions.every((entry) => entry.percent === null)

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Knowledge Contribution</h2>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        Share of total retrieved-evidence citations each agent drew on.
      </p>

      {allUnavailable ? (
        <EmptyState icon={PieChartIcon} title="Not Available" description="No agent cited retrieved evidence for this analysis." />
      ) : (
        <div className="flex flex-col gap-4">
          {contributions.map((entry) => {
            const Icon = AGENT_ICONS[entry.agentName]
            return (
              <div key={entry.agentName}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    {entry.agentName} Agent
                  </span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {entry.percent !== null ? <AnimatedCounter value={entry.percent} suffix="%" /> : 'Not Available'}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${AGENT_BAR_COLOR[entry.agentName]} ${entry.percent === null ? 'opacity-30' : ''}`}
                    style={{ width: `${entry.percent ?? 0}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  {entry.evidenceCount} evidence citation{entry.evidenceCount === 1 ? '' : 's'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default KnowledgeContributionSection
