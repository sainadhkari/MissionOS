import { Workflow } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import { buildPipelineStages } from '../../utils/collaborationCenter'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'

interface MissionProgressChartProps {
  datasets: Dataset[]
  analysis: MissionAnalysis | null
}

/** What share of the eleven real pipeline stages (dataset → chunks →
 * embeddings → ChromaDB → retrieval → four agents → report) have completed
 * — reuses the same stage derivation as the AI Collaboration Center's Live
 * Pipeline so the two views never disagree. */
function MissionProgressChart({ datasets, analysis }: MissionProgressChartProps) {
  const stages = buildPipelineStages(datasets, analysis)
  const completed = stages.filter((s) => s.status === 'completed').length
  const percent = Math.round((completed / stages.length) * 100)

  return (
    <ChartCard title="Pipeline Progress" icon={Workflow} caption={`${completed} of ${stages.length} pipeline stages complete`}>
      <div className="flex justify-center">
        <Gauge value={percent} label="Pipeline Progress" />
      </div>
    </ChartCard>
  )
}

export default MissionProgressChart
