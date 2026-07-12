export type DatasetUploadStatus = 'uploaded' | 'validating' | 'ready' | 'failed'
export type DatasetColumnCategory = 'numeric' | 'categorical' | 'date'

export interface DatasetColumnInfo {
  name: string
  dtype: string
  category: DatasetColumnCategory
  missing_count: number
}

export interface NumericColumnSummary {
  count: number
  min: number | null
  max: number | null
  mean: number | null
  median: number | null
  std: number | null
}

export interface CategoricalTopValue {
  value: string | number | boolean | null
  count: number
}

export interface CategoricalColumnSummary {
  unique_count: number
  top_values: CategoricalTopValue[]
}

export interface DatasetProfile {
  id: string
  dataset_id: string
  row_count: number
  column_count: number
  columns: DatasetColumnInfo[]
  missing_values: Record<string, number>
  duplicate_row_count: number
  numeric_summary: Record<string, NumericColumnSummary>
  categorical_summary: Record<string, CategoricalColumnSummary>
  encoding: string | null
  delimiter: string | null
  validation_errors: string[] | null
  created_at: string
  updated_at: string
}

export type RagIndexStatus = 'pending' | 'indexing' | 'indexed' | 'failed'

export interface DatasetIndex {
  id: string
  dataset_id: string
  status: RagIndexStatus
  chunk_count: number
  embedding_model: string | null
  error_message: string | null
  indexed_at: string | null
  created_at: string
  updated_at: string
}

export interface Dataset {
  id: string
  mission_id: string
  original_filename: string
  file_type: string
  file_size: number
  upload_status: DatasetUploadStatus
  created_at: string
  profile: DatasetProfile | null
  index: DatasetIndex | null
}

export const NON_TERMINAL_DATASET_STATUSES: DatasetUploadStatus[] = ['uploaded', 'validating']
export const NON_TERMINAL_RAG_INDEX_STATUSES: RagIndexStatus[] = ['pending', 'indexing']
