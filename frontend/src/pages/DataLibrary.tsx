import { Database, FileJson, FileSpreadsheet, FileText, Table as TableIcon, Upload, UploadCloud } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import type { Dataset } from '../types/Dataset'

const datasets: Dataset[] = []
const recentUploads: Dataset[] = []

const SUPPORTED_FILE_TYPES = [
  { label: 'CSV', icon: FileSpreadsheet },
  { label: 'Excel (XLSX)', icon: TableIcon },
  { label: 'JSON', icon: FileJson },
  { label: 'Parquet', icon: FileText },
]

function DataLibrary() {
  return (
    <div>
      <PageHeader
        title="Data Library"
        subtitle="Placeholder page — manage datasets connected to MissionOS."
        actions={
          <Button variant="primary" size="sm" disabled>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload Dataset
          </Button>
        }
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Uploaded Datasets</h2>
        {datasets.length === 0 && (
          <EmptyState
            icon={Database}
            title="No datasets uploaded yet"
            description="Upload a dataset to make it available to your missions."
          />
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Data Quality</h2>
          <p className="text-sm text-neutral-500">
            Quality metrics will appear once datasets are uploaded.
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Storage Status</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Datasets</span>
            <span className="font-medium text-neutral-900">—</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-neutral-500">Storage Used</span>
            <span className="font-medium text-neutral-900">—</span>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Supported File Types</h2>
        <div className="flex flex-wrap gap-3">
          {SUPPORTED_FILE_TYPES.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700"
            >
              <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Recent Uploads</h2>
        {recentUploads.length === 0 && (
          <EmptyState icon={UploadCloud} title="No recent uploads" />
        )}
      </Card>
    </div>
  )
}

export default DataLibrary
