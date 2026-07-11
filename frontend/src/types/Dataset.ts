export type DatasetUploadStatus = 'uploaded' | 'validating' | 'ready' | 'failed'

export interface Dataset {
  id: string
  mission_id: string
  original_filename: string
  file_type: string
  file_size: number
  upload_status: DatasetUploadStatus
  created_at: string
}
