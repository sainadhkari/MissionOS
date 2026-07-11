import type { BadgeVariant } from '../components/Badge'
import type { DatasetUploadStatus } from '../types/Dataset'

const STATUS_LABELS: Record<DatasetUploadStatus, string> = {
  uploaded: 'Uploaded',
  validating: 'Validating',
  ready: 'Ready',
  failed: 'Failed',
}

const STATUS_BADGE_VARIANTS: Record<DatasetUploadStatus, BadgeVariant> = {
  uploaded: 'success',
  validating: 'warning',
  ready: 'success',
  failed: 'danger',
}

export function datasetStatusLabel(status: DatasetUploadStatus): string {
  return STATUS_LABELS[status]
}

export function datasetStatusBadgeVariant(status: DatasetUploadStatus): BadgeVariant {
  return STATUS_BADGE_VARIANTS[status]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}
