import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileJson,
  FileSpreadsheet,
  Sparkles,
  Table as TableIcon,
  UploadCloud,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Banner from '../components/Banner'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import Select from '../components/Select'
import DatasetUploader from '../components/DatasetUploader'
import AnimatedCounter from '../components/AnimatedCounter'
import { ListCardSkeleton } from '../components/Skeleton'
import { buttonClasses } from '../components/Button'
import { missionDetailsPath, datasetDetailsPath } from '../constants/routes'
import { useMissions } from '../hooks/useMissions'
import { useAllDatasets } from '../hooks/useAllDatasets'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import {
  columnCategoryBadgeVariant,
  columnCategoryLabel,
  datasetStatusBadgeVariant,
  datasetStatusLabel,
  formatFileSize,
  ragIndexStatusBadgeVariant,
  ragIndexStatusLabel,
} from '../utils/dataset'
import { computeDatasetQuality } from '../utils/executiveDashboard'
import type { DatasetWithMission } from '../hooks/useAllDatasets'

const SUPPORTED_FILE_TYPES = [
  { label: 'CSV', icon: FileSpreadsheet },
  { label: 'Excel (XLSX)', icon: TableIcon },
  { label: 'JSON', icon: FileJson },
]

function DataLibrary() {
  const missions = useMissions()
  const missionsData = missions.status === 'success' ? missions.data : null
  const datasetsState = useAllDatasets(missionsData)

  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleDelete(datasetId: string) {
    if (!window.confirm('Delete this dataset? This cannot be undone.')) return

    setActionError(null)
    setDeletingId(datasetId)
    try {
      await datasetService.remove(datasetId)
      setBanner('Dataset deleted.')
      datasetsState.refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete dataset.'))
    } finally {
      setDeletingId(null)
    }
  }

  const effectiveMissionId = selectedMissionId || missionsData?.[0]?.id || ''
  const datasets: DatasetWithMission[] = datasetsState.status === 'success' ? datasetsState.data : []
  const totalSize = datasets.reduce((sum, dataset) => sum + dataset.file_size, 0)
  const recentUploads = datasets.slice(0, 5)
  const aggregateQuality = computeDatasetQuality(datasets)
  const totalVectors = datasets.reduce((sum, dataset) => sum + (dataset.index?.chunk_count ?? 0), 0)
  const indexedCount = datasets.filter((dataset) => dataset.index?.status === 'indexed').length

  return (
    <div>
      <PageHeader
        title="Data Library"
        subtitle="Upload and manage datasets connected to your missions."
        actions={
          missionsData && missionsData.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                id="uploadMission"
                value={effectiveMissionId}
                onChange={(event) => setSelectedMissionId(event.target.value)}
                className="h-8 text-xs"
              >
                {missionsData.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.title}
                  </option>
                ))}
              </Select>
              <DatasetUploader
                missionId={effectiveMissionId || null}
                onUploaded={(dataset) => {
                  setBanner(`${dataset.original_filename} uploaded successfully.`)
                  datasetsState.refetch()
                }}
              />
            </div>
          ) : (
            <span className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Create a mission first to upload datasets
            </span>
          )
        }
      />

      {banner && (
        <Banner variant="success" className="mb-4">
          {banner}
        </Banner>
      )}
      {actionError && (
        <Banner variant="danger" className="mb-4">
          {actionError}
        </Banner>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Datasets</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {datasetsState.status === 'success' ? <AnimatedCounter value={datasets.length} /> : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Storage Used</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {datasetsState.status === 'success' ? formatFileSize(totalSize) : '—'}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Data Quality</p>
          {aggregateQuality ? (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                <AnimatedCounter value={aggregateQuality.scorePercent} suffix="%" />
              </p>
              <Badge variant={aggregateQuality.variant}>{aggregateQuality.label}</Badge>
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">Awaiting validated data</p>
          )}
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Vectors Indexed
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {datasetsState.status === 'success' ? <AnimatedCounter value={totalVectors} /> : '—'}
          </p>
          {datasetsState.status === 'success' && datasets.length > 0 && (
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              {indexedCount}/{datasets.length} datasets indexed
            </p>
          )}
        </Card>
        <Card>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Missions Connected</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {missionsData ? <AnimatedCounter value={missionsData.length} /> : '—'}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Uploaded Datasets</h2>

        {(missions.status === 'loading' || datasetsState.status === 'loading') && <ListCardSkeleton />}

        {missions.status === 'error' && <Banner variant="danger">{missions.message}</Banner>}
        {datasetsState.status === 'error' && <Banner variant="danger">{datasetsState.message}</Banner>}

        {datasetsState.status === 'success' && datasets.length === 0 && (
          <EmptyState
            icon={Database}
            title="No datasets uploaded yet"
            description="Upload a dataset to make it available to your missions."
          />
        )}

        {datasetsState.status === 'success' && datasets.length > 0 && (
          <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {datasets.map((dataset) => {
              const profile = dataset.profile
              const isExpanded = expandedId === dataset.id
              const rowQuality = profile ? computeDatasetQuality([dataset]) : null
              const missingCells = profile
                ? Object.values(profile.missing_values).reduce((sum, count) => sum + count, 0)
                : 0

              return (
                <div key={dataset.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={datasetDetailsPath(dataset.id)}
                          className="truncate font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
                        >
                          {dataset.original_filename}
                        </Link>
                        <span className="shrink-0 text-xs uppercase text-neutral-400 dark:text-neutral-500">
                          {dataset.file_type}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        <Link to={missionDetailsPath(dataset.mission_id)} className="hover:text-primary-600 dark:hover:text-primary-400">
                          {dataset.missionTitle}
                        </Link>
                        {' · '}
                        {formatFileSize(dataset.file_size)}
                        {' · '}
                        {formatDate(dataset.created_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={datasetStatusBadgeVariant(dataset.upload_status)}>
                        {datasetStatusLabel(dataset.upload_status)}
                      </Badge>
                      {dataset.index && (
                        <Badge variant={ragIndexStatusBadgeVariant(dataset.index.status)}>
                          {ragIndexStatusLabel(dataset.index.status)}
                        </Badge>
                      )}
                      {rowQuality && <Badge variant={rowQuality.variant}>{rowQuality.scorePercent}% quality</Badge>}
                      {profile && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : dataset.id)}
                          className={buttonClasses('outline', 'sm')}
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          Preview
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(dataset.id)}
                        disabled={deletingId === dataset.id}
                        className={buttonClasses('outline', 'sm')}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {profile && (
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>
                        <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                          {profile.row_count.toLocaleString()}
                        </strong>{' '}
                        rows
                      </span>
                      <span>
                        <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                          {profile.column_count}
                        </strong>{' '}
                        columns
                      </span>
                      <span>
                        <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                          {missingCells.toLocaleString()}
                        </strong>{' '}
                        missing values
                      </span>
                      <span>
                        <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                          {profile.duplicate_row_count.toLocaleString()}
                        </strong>{' '}
                        duplicate rows
                      </span>
                      {dataset.index?.status === 'indexed' && (
                        <span>
                          <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                            {dataset.index.chunk_count.toLocaleString()}
                          </strong>{' '}
                          vector chunks
                        </span>
                      )}
                    </div>
                  )}

                  {isExpanded && profile && (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/60">
                          <tr>
                            <th className="px-3 py-2 font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                              Column
                            </th>
                            <th className="px-3 py-2 font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                              Type
                            </th>
                            <th className="px-3 py-2 font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                              Category
                            </th>
                            <th className="px-3 py-2 font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                              Missing
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {profile.columns.map((column) => (
                            <tr key={column.name}>
                              <td className="px-3 py-2 font-medium text-neutral-800 dark:text-neutral-200">
                                {column.name}
                              </td>
                              <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{column.dtype}</td>
                              <td className="px-3 py-2">
                                <Badge variant={columnCategoryBadgeVariant(column.category)}>
                                  {columnCategoryLabel(column.category)}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">
                                {column.missing_count.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Supported File Types</h2>
        <div className="flex flex-wrap gap-3">
          {SUPPORTED_FILE_TYPES.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
            >
              <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">Maximum file size: 25 MB</p>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Uploads</h2>
        {recentUploads.length === 0 ? (
          <EmptyState icon={UploadCloud} title="No recent uploads" />
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {recentUploads.map((dataset) => (
              <li key={dataset.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  to={datasetDetailsPath(dataset.id)}
                  className="min-w-0 flex-1 truncate text-sm text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
                >
                  {dataset.original_filename}
                </Link>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(dataset.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default DataLibrary
