import { CheckCircle2 } from 'lucide-react'
import { capitalize } from '../../utils/executiveDashboard'

interface ExecutiveRecommendationBannerProps {
  finalRecommendation: string
  businessDomain: string
  priority: string
  aiConfidence: number | null
}

/** The large hero banner answering "what should leadership do" — the
 * Executive Agent's final recommendation plus overall AI confidence.
 * Extracted from the Executive Dashboard so the Executive Report can
 * reuse the exact same banner rather than duplicating it. */
function ExecutiveRecommendationBanner({ finalRecommendation, businessDomain, priority, aiConfidence }: ExecutiveRecommendationBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-violet-700 p-6 text-white shadow-glow sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Analysis Completed
          </span>
          <h2 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">{finalRecommendation}</h2>
          <p className="mt-2 text-sm text-white/70">
            {businessDomain} · Priority: {capitalize(priority)}
          </p>
        </div>
        {aiConfidence !== null && (
          <div className="shrink-0 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
            <ConfidenceGaugeLight value={aiConfidence} />
          </div>
        )}
      </div>
    </div>
  )
}

/** A compact confidence readout tuned for a colored gradient background
 * rather than a card surface. */
function ConfidenceGaugeLight({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span className="text-4xl font-bold text-white">{Math.round(value * 100)}%</span>
      <span className="text-xs font-medium text-white/70">AI Confidence</span>
    </div>
  )
}

export default ExecutiveRecommendationBanner
