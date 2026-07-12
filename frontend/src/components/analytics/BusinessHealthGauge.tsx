import { Activity } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import type { BusinessAnalysis } from '../../types/Analysis'

interface BusinessHealthGaugeProps {
  business: BusinessAnalysis | null
}

/** How healthy the Business Agent judged the mission's underlying business
 * problem to be — reads directly from `business_analysis.confidence`. */
function BusinessHealthGauge({ business }: BusinessHealthGaugeProps) {
  const value = business ? Math.round(business.confidence * 100) : null
  return (
    <ChartCard title="Business Health" icon={Activity} caption="Business Agent's confidence in its assessment" available={value !== null}>
      <div className="flex justify-center">
        <Gauge value={value} label="Business Health" />
      </div>
    </ChartCard>
  )
}

export default BusinessHealthGauge
