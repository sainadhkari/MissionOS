import { CheckCircle2, Gauge, Quote, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import Badge from '../Badge'
import { confidenceLabel, topRisks } from '../../utils/executiveDashboard'
import { deploymentReadinessLabel } from '../../utils/collaborationCenter'
import { severityBadgeVariant } from '../../utils/analysis'
import type { MissionAnalysis } from '../../types/Analysis'

interface FinalDecisionCardProps {
  analysis: MissionAnalysis | null
  decisionStrengthPercent: number | null
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{label}</h4>
      <p className={`mt-1 text-sm ${value ? 'text-white' : 'italic text-white/50'}`}>{value ?? 'Not Available'}</p>
    </div>
  )
}

/** The flagship "so what" card — the executive agent's final recommendation
 * plus everything needed to trust it. "Expected ROI" has no grounding in
 * any real backend field (no cost/revenue data exists anywhere in the API)
 * so it always shows "Not Available"; "Deployment Readiness" is a
 * transparent formula over confidence + risk level, not an invented status. */
function FinalDecisionCard({ analysis, decisionStrengthPercent }: FinalDecisionCardProps) {
  const executive = analysis?.executive_analysis ?? null
  const risk = analysis?.risk_analysis ?? null
  const strategy = analysis?.strategy_analysis ?? null
  const retrieval = analysis?.retrieval_stats ?? null
  const risks = risk ? topRisks(risk.critical_risks, 3) : []
  const readiness = deploymentReadinessLabel(
    executive ? Math.round(executive.confidence * 100) : null,
    risk?.overall_risk_level ?? null
  )

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-violet-700 p-6 text-white shadow-glow sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Final Decision
            </span>
            <h2 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">
              {executive?.final_recommendation ?? 'Not Available'}
            </h2>
          </div>
          {executive && (
            <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold">{Math.round(executive.confidence * 100)}%</p>
              <p className="text-xs font-medium text-white/70">{confidenceLabel(executive.confidence)} Confidence</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Business Impact" value={strategy?.business_impact ?? null} />
          <Field label="Expected ROI" value={null} />
          <Field label="Deployment Readiness" value={readiness} />
          <Field
            label="Decision Strength"
            value={decisionStrengthPercent !== null ? `${decisionStrengthPercent}%` : null}
          />
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
            Key Risks
          </h4>
          {risks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {risks.map((item, index) => (
                <Badge key={index} variant={severityBadgeVariant(item.severity)} className="bg-white/90">
                  {item.title}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-white/50">Not Available</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 border-t border-white/15 pt-5 sm:grid-cols-3">
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
              <Quote className="h-3.5 w-3.5" aria-hidden="true" />
              Evidence Used
            </h4>
            <p className="text-sm text-white">
              {executive ? `${executive.evidence_used.length} citation${executive.evidence_used.length === 1 ? '' : 's'}` : 'Not Available'}
            </p>
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Retrieved Sources
            </h4>
            <p className="text-sm text-white">{retrieval && retrieval.sources.length > 0 ? retrieval.sources.join(', ') : 'Not Available'}</p>
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              Decision Strength
            </h4>
            <p className="flex items-center gap-1.5 text-sm text-white">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {decisionStrengthPercent !== null ? `${decisionStrengthPercent}%` : 'Not Available'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinalDecisionCard
