import type { BadgeVariant } from '../components/Badge'
import type { DatasetColumnCategory, DatasetUploadStatus, RagIndexStatus } from '../types/Dataset'

const STATUS_LABELS: Record<DatasetUploadStatus, string> = {
  uploaded: 'Uploaded',
  validating: 'Validating',
  ready: 'Validated',
  failed: 'Validation Failed',
}

const STATUS_BADGE_VARIANTS: Record<DatasetUploadStatus, BadgeVariant> = {
  uploaded: 'neutral',
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

const CATEGORY_LABELS: Record<DatasetColumnCategory, string> = {
  numeric: 'Numeric',
  categorical: 'Categorical',
  date: 'Date',
}

const CATEGORY_BADGE_VARIANTS: Record<DatasetColumnCategory, BadgeVariant> = {
  numeric: 'info',
  categorical: 'neutral',
  date: 'primary',
}

export function columnCategoryLabel(category: DatasetColumnCategory): string {
  return CATEGORY_LABELS[category]
}

export function columnCategoryBadgeVariant(category: DatasetColumnCategory): BadgeVariant {
  return CATEGORY_BADGE_VARIANTS[category]
}

export function formatStatValue(value: number | null): string {
  if (value === null) return '—'
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)
}

const RAG_INDEX_STATUS_LABELS: Record<RagIndexStatus, string> = {
  pending: 'Not Indexed',
  indexing: 'Indexing…',
  indexed: 'Indexed',
  failed: 'Indexing Failed',
}

const RAG_INDEX_STATUS_BADGE_VARIANTS: Record<RagIndexStatus, BadgeVariant> = {
  pending: 'neutral',
  indexing: 'warning',
  indexed: 'success',
  failed: 'danger',
}

export function ragIndexStatusLabel(status: RagIndexStatus): string {
  return RAG_INDEX_STATUS_LABELS[status]
}

export function ragIndexStatusBadgeVariant(status: RagIndexStatus): BadgeVariant {
  return RAG_INDEX_STATUS_BADGE_VARIANTS[status]
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
