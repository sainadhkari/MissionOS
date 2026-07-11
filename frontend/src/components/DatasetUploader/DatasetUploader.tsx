import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import Button from '../Button'
import Banner from '../Banner'
import ProgressBar from '../ProgressBar'
import { datasetService } from '../../services/dataset'
import { getErrorMessage } from '../../utils/http'
import type { Dataset } from '../../types/Dataset'

const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'json']
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

function validateFile(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Unsupported file type. Allowed types: CSV, XLSX, JSON.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'File exceeds the 25 MB size limit.'
  }
  return null
}

interface DatasetUploaderProps {
  missionId: string | null
  onUploaded: (dataset: Dataset) => void
  disabledReason?: string
}

function DatasetUploader({ missionId, onUploaded, disabledReason }: DatasetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const isDisabled = !missionId || progress !== null

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !missionId) return

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setProgress(0)
    try {
      const dataset = await datasetService.upload(missionId, file, setProgress)
      onUploaded(dataset)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not upload file.'))
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isDisabled}
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          {progress !== null ? `Uploading… ${progress}%` : 'Upload Dataset'}
        </Button>
        {!missionId && disabledReason && (
          <span className="text-xs text-neutral-400">{disabledReason}</span>
        )}
      </div>
      {progress !== null && <ProgressBar value={progress} />}
      {error && <Banner variant="danger">{error}</Banner>}
    </div>
  )
}

export default DatasetUploader
