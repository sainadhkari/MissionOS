import type { BadgeVariant } from '../components/Badge'
import type { MissionPriority, MissionStatus } from '../types/Mission'

const STATUS_LABELS: Record<MissionStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_BADGE_VARIANTS: Record<MissionStatus, BadgeVariant> = {
  draft: 'neutral',
  ready: 'info',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
}

const PRIORITY_LABELS: Record<MissionPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const PRIORITY_BADGE_VARIANTS: Record<MissionPriority, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
}

export function missionStatusLabel(status: MissionStatus): string {
  return STATUS_LABELS[status]
}

export function missionStatusBadgeVariant(status: MissionStatus): BadgeVariant {
  return STATUS_BADGE_VARIANTS[status]
}

export function missionPriorityLabel(priority: MissionPriority): string {
  return PRIORITY_LABELS[priority]
}

export function missionPriorityBadgeVariant(priority: MissionPriority): BadgeVariant {
  return PRIORITY_BADGE_VARIANTS[priority]
}
