import { Activity, Calendar, Database, Layers, Search, Sparkles, Target } from 'lucide-react'
import KpiCard from '../KpiCard'
import Badge from '../Badge'
import { formatDate } from '../../utils/date'
import { missionStatusBadgeVariant, missionStatusLabel } from '../../utils/mission'
import { confidenceBadgeVariant, confidenceLabel } from '../../utils/executiveDashboard'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'
import type { Mission } from '../../types/Mission'

interface MissionOverviewSectionProps {
  mission: Mission
  analysis: MissionAnalysis | null
  datasets: Dataset[]
  overallConfidencePercent: number | null
}

function MissionOverviewSection({ mission, analysis, datasets, overallConfidencePercent }: MissionOverviewSectionProps) {
  const indexedChunks = datasets
    .filter((d) => d.index?.status === 'indexed')
    .reduce((sum, d) => sum + (d.index?.chunk_count ?? 0), 0)
  const retrievedChunks = analysis?.retrieval_stats?.chunks_retrieved ?? null

  return (
    <section>
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white/70 p-6 shadow-card backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
              Mission Overview
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {mission.title}
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{mission.business_domain}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={missionStatusBadgeVariant(mission.status)}>{missionStatusLabel(mission.status)}</Badge>
            <span className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              Created {formatDate(mission.created_at)} · Updated {formatDate(mission.updated_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={Activity}
          label="Status"
          value=""
          badgeLabel={missionStatusLabel(mission.status)}
          badgeVariant={missionStatusBadgeVariant(mission.status)}
          caption="Current mission status"
        />
        <KpiCard
          icon={Sparkles}
          label="AI Confidence"
          value={overallConfidencePercent !== null ? `${overallConfidencePercent}%` : '—'}
          badgeLabel={overallConfidencePercent !== null ? confidenceLabel(overallConfidencePercent / 100) : undefined}
          badgeVariant={overallConfidencePercent !== null ? confidenceBadgeVariant(overallConfidencePercent / 100) : undefined}
          caption="Average across all agents"
        />
        <KpiCard
          icon={Database}
          label="Datasets"
          value={String(datasets.length)}
          caption={`${datasets.filter((d) => d.upload_status === 'ready').length} validated`}
        />
        <KpiCard
          icon={Layers}
          label="Indexed Chunks"
          value={indexedChunks > 0 ? String(indexedChunks) : '—'}
          caption="Across all indexed datasets"
        />
        <KpiCard
          icon={Search}
          label="Retrieved Chunks"
          value={retrievedChunks !== null ? String(retrievedChunks) : '—'}
          caption={analysis?.retrieval_stats ? `of top-${analysis.retrieval_stats.top_k}` : 'Not Available'}
        />
        <KpiCard
          icon={Target}
          label="Analysis Completed"
          value={analysis?.completed_at ? formatDate(analysis.completed_at) : '—'}
          caption={analysis?.status ?? 'Not Available'}
        />
      </div>
    </section>
  )
}

export default MissionOverviewSection
