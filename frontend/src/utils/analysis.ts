import type { BadgeVariant } from '../components/Badge'
import type { AnalysisViewStatus } from '../types/Analysis'

const STATUS_LABELS: Record<AnalysisViewStatus, string> = {
  not_started: 'Not Started',
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_BADGE_VARIANTS: Record<AnalysisViewStatus, BadgeVariant> = {
  not_started: 'neutral',
  pending: 'neutral',
  running: 'warning',
  completed: 'success',
  failed: 'danger',
}

export function analysisStatusLabel(status: AnalysisViewStatus): string {
  return STATUS_LABELS[status]
}

export function analysisStatusBadgeVariant(status: AnalysisViewStatus): BadgeVariant {
  return STATUS_BADGE_VARIANTS[status]
}

/** Business/Strategy/Risk analyses report severity-like fields (priority,
 * severity, probability, overall_risk_level) as free-form LLM text, not a
 * validated enum — this maps the common Low/Medium/High/Critical vocabulary
 * to a badge variant, falling back to neutral for anything unrecognized. */
export function severityBadgeVariant(value: string): BadgeVariant {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('critical')) return 'danger'
  if (normalized.includes('high')) return 'warning'
  if (normalized.includes('medium') || normalized.includes('moderate')) return 'info'
  if (normalized.includes('low')) return 'neutral'
  return 'neutral'
}

/** Illustrative, rotating progress text shown while an analysis is
 * `running` — the backend only tracks pending/running, not which of the
 * four agents is currently executing, so this cycles through the pipeline
 * stages for a sense of progress rather than asserting precise state. */
export const RUNNING_STAGE_MESSAGES = [
  'Business analysis…',
  'Strategy analysis…',
  'Risk assessment…',
  'Executive summary…',
]
