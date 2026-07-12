import { Radar } from 'lucide-react'
import { ChartCard, RadarChartCard } from '../Charts'
import { buildDatasetQualityRadar } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface DatasetQualityRadarProps {
  datasets: Dataset[]
}

/** Five independent quality axes (Completeness, Uniqueness, Validation,
 * Indexing, Profiling), each a real percentage derived from
 * `DatasetProfile`/`Dataset.index` fields — not a single opaque score. */
function DatasetQualityRadar({ datasets }: DatasetQualityRadarProps) {
  const data = buildDatasetQualityRadar(datasets)

  return (
    <ChartCard
      title="Dataset Quality Radar"
      icon={Radar}
      caption="Completeness, uniqueness, validation, indexing, and profiling"
      available={Boolean(data)}
      emptyReason="No profiled datasets yet."
    >
      {data && <RadarChartCard data={data} />}
    </ChartCard>
  )
}

export default DatasetQualityRadar
