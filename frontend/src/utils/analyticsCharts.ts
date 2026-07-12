import type { MissionAnalysis, RiskAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'
import type { WaterfallStep, RadarDatum } from '../components/Charts'
import { buildConsensusMetrics } from './collaborationCenter'

// ---------------------------------------------------------------------------
// Risk Distribution
// ---------------------------------------------------------------------------

const SEVERITY_BUCKETS = ['Critical', 'High', 'Medium', 'Low'] as const

function normalizeSeverity(value: string): (typeof SEVERITY_BUCKETS)[number] | 'Other' {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('critical')) return 'Critical'
  if (normalized.includes('high')) return 'High'
  if (normalized.includes('medium') || normalized.includes('moderate')) return 'Medium'
  if (normalized.includes('low')) return 'Low'
  return 'Other'
}

export interface CategoryCount {
  label: string
  value: number
}

/** Buckets `critical_risks` by their free-form `severity` text (the backend
 * doesn't validate it as an enum) into the standard Low/Medium/High/Critical
 * vocabulary used everywhere else in the app. */
export function buildRiskSeverityDistribution(risk: RiskAnalysis | null): CategoryCount[] | null {
  if (!risk || risk.critical_risks.length === 0) return null
  const counts = new Map<string, number>()
  for (const item of risk.critical_risks) {
    const bucket = normalizeSeverity(item.severity)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
  }
  return [...SEVERITY_BUCKETS, 'Other']
    .filter((bucket) => counts.has(bucket))
    .map((bucket) => ({ label: bucket, value: counts.get(bucket)! }))
}

/** Maps the free-form `overall_risk_level` text to an anchor percent on a
 * 0-100 "how risky" scale — the same vocabulary `normalizeSeverity` already
 * recognizes, just read as a single score instead of a distribution. */
export function riskLevelToPercent(overallRiskLevel: string | null | undefined): number | null {
  if (!overallRiskLevel) return null
  const bucket = normalizeSeverity(overallRiskLevel)
  const anchors: Record<string, number> = { Critical: 92, High: 70, Medium: 40, Low: 15, Other: 50 }
  return anchors[bucket] ?? null
}

/** A transparent formula (confidence weighed against risk) rather than an
 * invented status — the numeric counterpart to
 * `collaborationCenter.deploymentReadinessLabel`. */
export function deploymentReadinessPercent(overallConfidencePercent: number | null, overallRiskLevel: string | null): number | null {
  if (overallConfidencePercent === null) return null
  const riskPercent = riskLevelToPercent(overallRiskLevel)
  const invertedRisk = riskPercent !== null ? 100 - riskPercent : null
  const inputs = [overallConfidencePercent, invertedRisk].filter((v): v is number => v !== null)
  return inputs.length > 0 ? Math.round(inputs.reduce((sum, v) => sum + v, 0) / inputs.length) : null
}

// ---------------------------------------------------------------------------
// Recommendation Categories
// ---------------------------------------------------------------------------

/** Counts how many recommendation-like items each agent contributed —
 * real, countable output sizes, not a weighted "importance" score. */
export function buildRecommendationCategories(analysis: MissionAnalysis | null): CategoryCount[] | null {
  if (!analysis) return null
  const entries: CategoryCount[] = []
  if (analysis.business_analysis) entries.push({ label: 'Business Next Steps', value: analysis.business_analysis.recommended_next_steps.length })
  if (analysis.strategy_analysis) entries.push({ label: 'Strategic Initiatives', value: analysis.strategy_analysis.recommended_initiatives.length })
  if (analysis.risk_analysis) entries.push({ label: 'Risk Mitigations', value: analysis.risk_analysis.recommended_mitigations.length })
  if (analysis.executive_analysis) entries.push({ label: 'Executive Trade-offs', value: analysis.executive_analysis.trade_offs.length })
  return entries.length > 0 ? entries : null
}

// ---------------------------------------------------------------------------
// Business Impact Waterfall
// ---------------------------------------------------------------------------

/** Charts how the final recommendation set accumulates as each agent adds
 * its own items — a real, countable quantity. There is no cost/revenue
 * field anywhere in the backend, so this is deliberately an item-count
 * waterfall, not a fabricated dollar figure. */
export function buildBusinessImpactWaterfallSteps(analysis: MissionAnalysis | null): WaterfallStep[] | null {
  if (!analysis) return null
  const steps: WaterfallStep[] = []
  if (analysis.business_analysis) steps.push({ label: 'Business', value: analysis.business_analysis.recommended_next_steps.length })
  if (analysis.strategy_analysis) steps.push({ label: 'Strategy', value: analysis.strategy_analysis.recommended_initiatives.length })
  if (analysis.risk_analysis) steps.push({ label: 'Risk', value: analysis.risk_analysis.recommended_mitigations.length })
  if (analysis.executive_analysis) steps.push({ label: 'Executive', value: analysis.executive_analysis.final_recommendation ? 1 : 0 })
  const total = steps.reduce((sum, s) => sum + s.value, 0)
  return steps.length > 0 && total > 0 ? steps : null
}

// ---------------------------------------------------------------------------
// Dataset Quality Radar
// ---------------------------------------------------------------------------

/** Five real, independently-meaningful axes derived purely from
 * `Dataset[]`/`DatasetProfile` fields already fetched — no invented score. */
export function buildDatasetQualityRadar(datasets: Dataset[]): RadarDatum[] | null {
  if (datasets.length === 0) return null
  const profiled = datasets.filter((d) => d.profile)
  if (profiled.length === 0) return null

  let totalCells = 0
  let missingCells = 0
  let totalRows = 0
  let duplicateRows = 0
  for (const dataset of profiled) {
    const profile = dataset.profile!
    totalCells += profile.row_count * profile.column_count
    missingCells += Object.values(profile.missing_values).reduce((sum, count) => sum + count, 0)
    totalRows += profile.row_count
    duplicateRows += profile.duplicate_row_count
  }

  const completeness = totalCells === 0 ? 1 : 1 - missingCells / totalCells
  const uniqueness = totalRows === 0 ? 1 : 1 - duplicateRows / totalRows
  const validationRate = datasets.filter((d) => d.upload_status === 'ready').length / datasets.length
  const indexingRate = datasets.filter((d) => d.index?.status === 'indexed').length / datasets.length
  const profilingRate = profiled.length / datasets.length

  return [
    { axis: 'Completeness', value: Math.round(Math.max(0, completeness) * 100) },
    { axis: 'Uniqueness', value: Math.round(Math.max(0, uniqueness) * 100) },
    { axis: 'Validation', value: Math.round(validationRate * 100) },
    { axis: 'Indexing', value: Math.round(indexingRate * 100) },
    { axis: 'Profiling', value: Math.round(profilingRate * 100) },
  ]
}

// ---------------------------------------------------------------------------
// Mission Health Score / Business Readiness
// ---------------------------------------------------------------------------

/** A single composite score averaging AI confidence, dataset quality, and
 * evidence coverage — the same three real metrics already shown
 * individually on the Consensus Dashboard, reused here rather than
 * re-derived. */
export function buildMissionHealthScore(analysis: MissionAnalysis | null, datasets: Dataset[]): number | null {
  const metrics = buildConsensusMetrics(analysis, datasets)
  const inputs = [metrics.overallConfidence, metrics.datasetQuality?.scorePercent ?? null, metrics.evidenceCoveragePercent].filter(
    (v): v is number => v !== null
  )
  return inputs.length > 0 ? Math.round(inputs.reduce((sum, v) => sum + v, 0) / inputs.length) : null
}

/** "Is the underlying data and evidence solid enough to trust this
 * recommendation" — deliberately omits confidence/risk (which
 * `DeploymentReadinessGauge` already covers) so the two gauges answer
 * different questions instead of duplicating one another. */
export function buildBusinessReadiness(analysis: MissionAnalysis | null, datasets: Dataset[]): number | null {
  const metrics = buildConsensusMetrics(analysis, datasets)
  const inputs = [metrics.datasetQuality?.scorePercent ?? null, metrics.evidenceCoveragePercent].filter(
    (v): v is number => v !== null
  )
  return inputs.length > 0 ? Math.round(inputs.reduce((sum, v) => sum + v, 0) / inputs.length) : null
}

// ---------------------------------------------------------------------------
// Evidence Sources
// ---------------------------------------------------------------------------

/** For each retrieved source dataset, counts how many times its filename is
 * mentioned across every agent's `evidence_used` text — a genuine
 * substring-match count over real stored text, not a fabricated per-source
 * weighting (the backend doesn't track which retrieved chunk came from
 * which source at the evidence-citation level, only in aggregate). */
export function buildEvidenceSourceMentions(analysis: MissionAnalysis | null): CategoryCount[] | null {
  const sources = analysis?.retrieval_stats?.sources ?? []
  if (sources.length === 0) return null

  const allEvidence = [
    ...(analysis?.business_analysis?.evidence_used ?? []),
    ...(analysis?.strategy_analysis?.evidence_used ?? []),
    ...(analysis?.risk_analysis?.evidence_used ?? []),
    ...(analysis?.executive_analysis?.evidence_used ?? []),
  ].join(' \n ')

  return sources.map((source) => {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = allEvidence.match(new RegExp(escaped, 'gi'))
    return { label: source, value: matches ? matches.length : 0 }
  })
}

// ---------------------------------------------------------------------------
// Dataset-level analytics (Data Library)
// ---------------------------------------------------------------------------

export interface DatasetMetric {
  label: string
  value: number
  caption?: string
}

export function buildDatasetSizeSeries(datasets: Dataset[]): DatasetMetric[] | null {
  if (datasets.length === 0) return null
  return [...datasets]
    .sort((a, b) => b.file_size - a.file_size)
    .slice(0, 8)
    .map((d) => ({ label: d.original_filename, value: Math.round(d.file_size / 1024) }))
}

export function buildRowsVsColumnsSeries(datasets: Dataset[]): { label: string; rows: number; columns: number }[] | null {
  const profiled = datasets.filter((d) => d.profile)
  if (profiled.length === 0) return null
  return profiled.slice(0, 8).map((d) => ({ label: d.original_filename, rows: d.profile!.row_count, columns: d.profile!.column_count }))
}

export function buildMissingValuesSeries(datasets: Dataset[]): DatasetMetric[] | null {
  const profiled = datasets.filter((d) => d.profile)
  if (profiled.length === 0) return null
  const entries = profiled
    .map((d) => ({
      label: d.original_filename,
      value: Object.values(d.profile!.missing_values).reduce((sum, count) => sum + count, 0),
    }))
    .filter((entry) => entry.value > 0)
  return entries.length > 0 ? entries.slice(0, 8) : null
}

export function buildDuplicateDistribution(datasets: Dataset[]): DatasetMetric[] | null {
  const profiled = datasets.filter((d) => d.profile && d.profile.row_count > 0)
  if (profiled.length === 0) return null
  const entries = profiled
    .map((d) => ({
      label: d.original_filename,
      value: Math.round((d.profile!.duplicate_row_count / d.profile!.row_count) * 100),
      caption: `${d.profile!.duplicate_row_count.toLocaleString()} of ${d.profile!.row_count.toLocaleString()} rows`,
    }))
    .filter((entry) => entry.value > 0)
  return entries.length > 0 ? entries.slice(0, 8) : null
}

export function buildCompletenessSeries(datasets: Dataset[]): DatasetMetric[] | null {
  const profiled = datasets.filter((d) => d.profile)
  if (profiled.length === 0) return null
  return profiled.slice(0, 8).map((d) => {
    const profile = d.profile!
    const totalCells = profile.row_count * profile.column_count
    const missingCells = Object.values(profile.missing_values).reduce((sum, count) => sum + count, 0)
    const completeness = totalCells === 0 ? 100 : Math.round((1 - missingCells / totalCells) * 100)
    return { label: d.original_filename, value: Math.max(0, completeness) }
  })
}
