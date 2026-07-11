import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, FileJson, FileSpreadsheet, Table as TableIcon, UploadCloud } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import Select from '../components/Select'
import DatasetUploader from '../components/DatasetUploader'
import { Table, TableBody, TableHeader, TableHeaderCell, TableRow, TableCell } from '../components/Table'
import { buttonClasses } from '../components/Button'
import { missionDetailsPath } from '../constants/routes'
import { useMissions } from '../hooks/useMissions'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import { datasetStatusBadgeVariant, datasetStatusLabel, formatFileSize } from '../utils/dataset'
import type { Dataset } from '../types/Dataset'
import type { Mission } from '../types/Mission'

const SUPPORTED_FILE_TYPES = [
  { label: 'CSV', icon: FileSpreadsheet },
  { label: 'Excel (XLSX)', icon: TableIcon },
  { label: 'JSON', icon: FileJson },
]

interface DatasetRow extends Dataset {
  missionTitle: string
}

type DatasetsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: DatasetRow[] }

function DataLibrary() {
  const missions = useMissions()
  const missionsData = missions.status === 'success' ? missions.data : null

  const [datasetsState, setDatasetsState] = useState<DatasetsState>({ status: 'loading' })
  const [selectedMissionId, setSelectedMissionId] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDatasets = useCallback((missionList: Mission[]) => {
    Promise.all(
      missionList.map((mission) =>
        datasetService
          .listForMission(mission.id)
          .then((datasets) =>
            datasets.map((dataset) => ({ ...dataset, missionTitle: mission.title }))
          )
      )
    )
      .then((perMission) => {
        const combined = perMission
          .flat()
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
        setDatasetsState({ status: 'success', data: combined })
      })
      .catch((err) =>
        setDatasetsState({
          status: 'error',
          message: getErrorMessage(err, 'Could not load datasets.'),
        })
      )
  }, [])

  useEffect(() => {
    if (!missionsData) return
    loadDatasets(missionsData)
  }, [missionsData, loadDatasets])

  function refetchDatasets() {
    if (!missionsData) return
    setDatasetsState({ status: 'loading' })
    loadDatasets(missionsData)
  }

  async function handleDelete(datasetId: string) {
    if (!window.confirm('Delete this dataset? This cannot be undone.')) return

    setActionError(null)
    setDeletingId(datasetId)
    try {
      await datasetService.remove(datasetId)
      setBanner('Dataset deleted.')
      refetchDatasets()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete dataset.'))
    } finally {
      setDeletingId(null)
    }
  }

  const effectiveMissionId = selectedMissionId || missionsData?.[0]?.id || ''
  const totalSize =
    datasetsState.status === 'success'
      ? datasetsState.data.reduce((sum, dataset) => sum + dataset.file_size, 0)
      : 0
  const recentUploads = datasetsState.status === 'success' ? datasetsState.data.slice(0, 5) : []

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
                  refetchDatasets()
                }}
              />
            </div>
          ) : (
            <span className="flex items-center gap-2 text-xs text-neutral-400">
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

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Uploaded Datasets</h2>

        {(missions.status === 'loading' || datasetsState.status === 'loading') && <Loading />}

        {missions.status === 'error' && <Banner variant="danger">{missions.message}</Banner>}
        {datasetsState.status === 'error' && (
          <Banner variant="danger">{datasetsState.message}</Banner>
        )}

        {datasetsState.status === 'success' && datasetsState.data.length === 0 && (
          <EmptyState
            icon={Database}
            title="No datasets uploaded yet"
            description="Upload a dataset to make it available to your missions."
          />
        )}

        {datasetsState.status === 'success' && datasetsState.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Dataset</TableHeaderCell>
                <TableHeaderCell>Mission</TableHeaderCell>
                <TableHeaderCell>Size</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Uploaded</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasetsState.data.map((dataset) => (
                <TableRow key={dataset.id}>
                  <TableCell>
                    <span className="font-medium text-neutral-900">
                      {dataset.original_filename}
                    </span>
                    <span className="ml-2 text-xs text-neutral-400">
                      {dataset.file_type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={missionDetailsPath(dataset.mission_id)}
                      className="text-neutral-700 hover:text-primary-600"
                    >
                      {dataset.missionTitle}
                    </Link>
                  </TableCell>
                  <TableCell>{formatFileSize(dataset.file_size)}</TableCell>
                  <TableCell>
                    <Badge variant={datasetStatusBadgeVariant(dataset.upload_status)}>
                      {datasetStatusLabel(dataset.upload_status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(dataset.created_at)}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleDelete(dataset.id)}
                      disabled={deletingId === dataset.id}
                      className={buttonClasses('outline', 'sm')}
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Data Quality</h2>
          <p className="text-sm text-neutral-500">
            Quality metrics will appear once datasets are processed.
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Storage Status</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">Datasets</span>
            <span className="font-medium text-neutral-900">
              {datasetsState.status === 'success' ? datasetsState.data.length : '—'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-neutral-500">Storage Used</span>
            <span className="font-medium text-neutral-900">
              {datasetsState.status === 'success' ? formatFileSize(totalSize) : '—'}
            </span>
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
        <p className="mt-3 text-xs text-neutral-400">Maximum file size: 25 MB</p>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Recent Uploads</h2>
        {recentUploads.length === 0 ? (
          <EmptyState icon={UploadCloud} title="No recent uploads" />
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-200">
            {recentUploads.map((dataset) => (
              <li key={dataset.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">
                  {dataset.original_filename}
                </span>
                <span className="text-xs text-neutral-400">{formatDate(dataset.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default DataLibrary
