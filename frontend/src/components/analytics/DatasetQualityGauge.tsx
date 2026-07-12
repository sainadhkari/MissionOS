import { Gauge as GaugeIcon } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import { computeDatasetQuality } from '../../utils/executiveDashboard'
import type { Dataset } from '../../types/Dataset'

interface DatasetQualityGaugeProps {
  datasets: Dataset[]
}

/** Aggregate dataset quality (completeness penalized by duplicate rate)
 * across every validated dataset — reuses the same `computeDatasetQuality`
 * already powering the KPI tiles on the Executive Dashboard and Data
 * Library's summary row. */
function DatasetQualityGauge({ datasets }: DatasetQualityGaugeProps) {
  const quality = computeDatasetQuality(datasets)

  return (
    <ChartCard title="Dataset Quality" icon={GaugeIcon} caption="Completeness penalized by duplicate rate" available={Boolean(quality)}>
      <div className="flex justify-center">
        <Gauge value={quality?.scorePercent ?? null} label="Dataset Quality" sublabel={quality?.label} />
      </div>
    </ChartCard>
  )
}

export default DatasetQualityGauge
