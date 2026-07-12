import type { BadgeVariant } from '../components/Badge'
import type { MissionAnalysis, RiskItem, StrategyAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'

export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** The four analysis stages each report their own `confidence` — this is
 * the simple average of whichever are present, used as a single "AI
 * Confidence" KPI. Returns `null` only if none are present, which
 * shouldn't happen once `status === 'completed'`. */
export function averageConfidence(analysis: MissionAnalysis): number | null {
  const values = [
    analysis.business_analysis?.confidence,
    analysis.strategy_analysis?.confidence,
    analysis.risk_analysis?.confidence,
    analysis.executive_analysis?.confidence,
  ].filter((value): value is number => typeof value === 'number')

  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function confidenceLabel(value: number): string {
  if (value >= 0.8) return 'High'
  if (value >= 0.5) return 'Moderate'
  return 'Low'
}

export function confidenceBadgeVariant(value: number): BadgeVariant {
  if (value >= 0.8) return 'success'
  if (value >= 0.5) return 'warning'
  return 'danger'
}

export interface DatasetQuality {
  scorePercent: number
  label: string
  variant: BadgeVariant
  readyCount: number
  totalCount: number
}

/** Derives a "Dataset Quality" KPI purely from data already returned by
 * `GET /missions/{id}/datasets` — completeness (share of non-missing
 * cells) penalized by duplicate-row rate, averaged across every validated
 * (`ready`) dataset attached to the mission. Returns `null` if none of the
 * mission's datasets have finished validating yet. */
export function computeDatasetQuality(datasets: Dataset[]): DatasetQuality | null {
  const readyWithProfile = datasets.filter((dataset) => dataset.upload_status === 'ready' && dataset.profile)
  if (readyWithProfile.length === 0) return null

  let totalCells = 0
  let missingCells = 0
  let totalRows = 0
  let duplicateRows = 0

  for (const dataset of readyWithProfile) {
    const profile = dataset.profile!
    totalCells += profile.row_count * profile.column_count
    missingCells += Object.values(profile.missing_values).reduce((sum, count) => sum + count, 0)
    totalRows += profile.row_count
    duplicateRows += profile.duplicate_row_count
  }

  const completeness = totalCells === 0 ? 1 : 1 - missingCells / totalCells
  const duplicateRate = totalRows === 0 ? 0 : duplicateRows / totalRows
  const score = Math.max(0, Math.min(1, completeness - duplicateRate * 0.5))
  const scorePercent = Math.round(score * 100)

  const label =
    scorePercent >= 90 ? 'Excellent' : scorePercent >= 75 ? 'Good' : scorePercent >= 50 ? 'Fair' : 'Poor'
  const variant: BadgeVariant =
    scorePercent >= 90 ? 'success' : scorePercent >= 75 ? 'info' : scorePercent >= 50 ? 'warning' : 'danger'

  return { scorePercent, label, variant, readyCount: readyWithProfile.length, totalCount: datasets.length }
}

function severityRank(value: string): number {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('critical')) return 4
  if (normalized.includes('high')) return 3
  if (normalized.includes('medium') || normalized.includes('moderate')) return 2
  if (normalized.includes('low')) return 1
  return 0
}

export function topRisks(risks: RiskItem[], limit = 5): RiskItem[] {
  return [...risks].sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, limit)
}

export function topRecommendations(strategy: StrategyAnalysis, limit = 5): string[] {
  return strategy.recommended_initiatives.slice(0, limit)
}
