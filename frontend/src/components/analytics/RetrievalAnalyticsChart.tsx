import { Layers } from 'lucide-react'
import { ChartCard } from '../Charts'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'

interface RetrievalAnalyticsChartProps {
  analysis: MissionAnalysis | null
  datasets: Dataset[]
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{label}</p>
      {value ? (
        <p className="mt-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100" title={value}>
          {value}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-neutral-400 dark:text-neutral-600">Not Available</p>
      )}
    </div>
  )
}

/** RAG retrieval metrics genuinely exposed to the frontend. "Context Size"
 * and "Embedding Requests" are computed by the backend for the exported
 * report only (`ReportRetrievalAnalytics`) and are not part of the
 * `MissionAnalysis` JSON the frontend fetches — since this is a
 * frontend-only change, they honestly show "Not Available" rather than
 * being invented client-side. */
function RetrievalAnalyticsChart({ analysis, datasets }: RetrievalAnalyticsChartProps) {
  const retrieval = analysis?.retrieval_stats ?? null
  const chunksIndexed = datasets
    .filter((d) => d.index?.status === 'indexed')
    .reduce((sum, d) => sum + (d.index?.chunk_count ?? 0), 0)

  return (
    <ChartCard title="Retrieval Analytics" icon={Layers} caption="RAG retrieval metrics for this mission's analysis">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Chunks Indexed" value={chunksIndexed > 0 ? String(chunksIndexed) : null} />
        <Stat label="Chunks Retrieved" value={retrieval ? String(retrieval.chunks_retrieved) : null} />
        <Stat
          label="Avg. Similarity"
          value={retrieval?.average_similarity_score != null ? `${Math.round(retrieval.average_similarity_score * 100)}%` : null}
        />
        <Stat label="Context Size" value={null} />
        <Stat label="Embedding Requests" value={null} />
        <Stat label="Retrieval Time" value={retrieval ? `${retrieval.retrieval_time_ms} ms` : null} />
      </div>
    </ChartCard>
  )
}

export default RetrievalAnalyticsChart
