import { Briefcase, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import ProgressBar from '../ProgressBar'
import AnimatedCounter from '../AnimatedCounter'
import { Gauge, DonutChart } from '../Charts'
import type { AgentName, ConsensusMetrics } from '../../utils/collaborationCenter'

const AGENT_ICONS: Record<AgentName, LucideIcon> = {
  Business: Briefcase,
  Strategy: Target,
  Risk: ShieldAlert,
  Executive: Sparkles,
}

function AgentGauge({ agentName, percent }: { agentName: AgentName; percent: number | null }) {
  const Icon = AGENT_ICONS[agentName]
  return (
    <div className="flex flex-col items-center">
      <Gauge value={percent} label="" size={90} />
      <p className="-mt-2 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {agentName}
      </p>
    </div>
  )
}

function MetricBar({ label, percent, caption }: { label: string; percent: number | null; caption: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          {percent !== null ? <AnimatedCounter value={percent} suffix="%" /> : 'Not Available'}
        </span>
      </div>
      <ProgressBar value={percent ?? 0} />
      <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{caption}</p>
    </div>
  )
}

interface ConsensusDashboardProps {
  metrics: ConsensusMetrics
}

/** Reuses the shared `Gauge`/`DonutChart` chart primitives (also used by
 * the Executive Dashboard's analytics suite) instead of bespoke inline SVG
 * and recharts markup, so this dashboard's visuals never drift from the
 * rest of the app's chart styling. */
function ConsensusDashboard({ metrics }: ConsensusDashboardProps) {
  const donutData = (
    [
      { name: 'Business', value: metrics.businessConfidence },
      { name: 'Strategy', value: metrics.strategyConfidence },
      { name: 'Risk', value: metrics.riskConfidence },
      { name: 'Executive', value: metrics.executiveConfidence },
    ] as { name: string; value: number | null }[]
  ).filter((entry): entry is { name: string; value: number } => entry.value !== null)

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Consensus Dashboard</h2>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        How aligned the four agents are, and how strong the resulting decision is.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/40">
          <Gauge value={metrics.overallConfidence} label="Overall Confidence" />
          <div className="grid w-full grid-cols-4 gap-2">
            <AgentGauge agentName="Business" percent={metrics.businessConfidence} />
            <AgentGauge agentName="Strategy" percent={metrics.strategyConfidence} />
            <AgentGauge agentName="Risk" percent={metrics.riskConfidence} />
            <AgentGauge agentName="Executive" percent={metrics.executiveConfidence} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <MetricBar
            label="Evidence Coverage"
            percent={metrics.evidenceCoveragePercent}
            caption="Share of agents that cited retrieved evidence"
          />
          <MetricBar
            label="Agent Agreement"
            percent={metrics.agentAgreementPercent}
            caption="How closely aligned the four confidence scores are"
          />
          <MetricBar
            label="Decision Strength"
            percent={metrics.decisionStrengthPercent}
            caption="Composite of confidence, evidence coverage, and agreement"
          />
          <MetricBar
            label="Dataset Quality"
            percent={metrics.datasetQuality?.scorePercent ?? null}
            caption={
              metrics.datasetQuality
                ? `${metrics.datasetQuality.readyCount}/${metrics.datasetQuality.totalCount} datasets validated`
                : 'No validated datasets'
            }
          />
        </div>

        <div className="flex flex-col items-center justify-center">
          <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">Confidence Distribution</p>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} height={200} valueSuffix="%" showLegend={false} />
          ) : (
            <p className="py-10 text-sm italic text-neutral-400 dark:text-neutral-600">Not Available</p>
          )}
        </div>
      </div>
    </Card>
  )
}

export default ConsensusDashboard
