import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  Database,
  Flag,
  Pencil,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import Button, { buttonClasses } from '../components/Button'
import DatasetUploader from '../components/DatasetUploader'
import MissionAnalysisSection from '../components/MissionAnalysisSection'
import { ROUTES, editMissionPath, missionReportPath, datasetDetailsPath } from '../constants/routes'
import { missionService } from '../services/mission'
import { datasetService } from '../services/dataset'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import { missionPriorityBadgeVariant, missionPriorityLabel, missionStatusBadgeVariant, missionStatusLabel } from '../utils/mission'
import {
  datasetStatusBadgeVariant,
  datasetStatusLabel,
  formatFileSize,
  ragIndexStatusBadgeVariant,
  ragIndexStatusLabel,
} from '../utils/dataset'
import type { Mission } from '../types/Mission'
import type { Dataset } from '../types/Dataset'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; mission: Mission }

const GOAL_FIELDS: { key: keyof Mission; label: string }[] = [
  { key: 'problem_statement', label: 'Problem Statement' },
  { key: 'objective', label: 'Business Objective' },
  { key: 'expected_output', label: 'Expected Output' },
]

function MissionDetails() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const navigationState = location.state as { created?: boolean; updated?: boolean } | null
  const successMessage = navigationState?.created
    ? 'Mission created successfully.'
    : navigationState?.updated
      ? 'Mission updated successfully.'
      : null

  useEffect(() => {
    if (!missionId) return
    missionService
      .get(missionId)
      .then((mission) => setState({ status: 'success', mission }))
      .catch((err) =>
        setState({ status: 'error', message: getErrorMessage(err, 'Mission not found.') })
      )
  }, [missionId])

  async function handleDelete() {
    if (!missionId) return
    if (!window.confirm('Delete this mission? This cannot be undone.')) return

    setDeleteError(null)
    setIsDeleting(true)
    try {
      await missionService.remove(missionId)
      navigate(ROUTES.missionHistory, { replace: true, state: { deleted: true } })
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Could not delete mission.'))
      setIsDeleting(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <div>
        <PageHeader title="Mission Details" />
        <Loading />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <PageHeader title="Mission Details" />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={state.message}
            action={
              <Link to={ROUTES.missionHistory} className={buttonClasses('outline', 'sm')}>
                Back to Mission History
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <MissionDetailsView
      mission={state.mission}
      successMessage={successMessage}
      deleteError={deleteError}
      isDeleting={isDeleting}
      onDelete={handleDelete}
    />
  )
}

interface MissionDetailsViewProps {
  mission: Mission
  successMessage: string | null
  deleteError: string | null
  isDeleting: boolean
  onDelete: () => void
}

function MissionDetailsView({
  mission,
  successMessage,
  deleteError,
  isDeleting,
  onDelete,
}: MissionDetailsViewProps) {
  const datasets = useMissionDatasets(mission.id)
  const [datasetBanner, setDatasetBanner] = useState<string | null>(null)
  const [datasetError, setDatasetError] = useState<string | null>(null)
  const [deletingDatasetId, setDeletingDatasetId] = useState<string | null>(null)
  const [reindexingId, setReindexingId] = useState<string | null>(null)

  async function handleDeleteDataset(datasetId: string) {
    if (!window.confirm('Delete this dataset? This cannot be undone.')) return

    setDatasetError(null)
    setDeletingDatasetId(datasetId)
    try {
      await datasetService.remove(datasetId)
      setDatasetBanner('Dataset deleted.')
      datasets.refetch()
    } catch (err) {
      setDatasetError(getErrorMessage(err, 'Could not delete dataset.'))
    } finally {
      setDeletingDatasetId(null)
    }
  }

  async function handleReindex(dataset: Dataset) {
    setDatasetError(null)
    setReindexingId(dataset.id)
    try {
      await datasetService.reindex(dataset.id)
      setDatasetBanner(`Re-indexing "${dataset.original_filename}" for RAG retrieval…`)
      datasets.refetch()
    } catch (err) {
      setDatasetError(getErrorMessage(err, 'Could not re-index dataset.'))
    } finally {
      setReindexingId(null)
    }
  }

  const datasetCount = datasets.status === 'success' ? datasets.data.length : null

  const overviewCards = [
    {
      label: 'Status',
      icon: Flag,
      content: <Badge variant={missionStatusBadgeVariant(mission.status)}>{missionStatusLabel(mission.status)}</Badge>,
    },
    {
      label: 'Priority',
      icon: Target,
      content: (
        <Badge variant={missionPriorityBadgeVariant(mission.priority)}>{missionPriorityLabel(mission.priority)}</Badge>
      ),
    },
    {
      label: 'Datasets',
      icon: Database,
      content: (
        <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {datasetCount ?? '—'}
        </span>
      ),
    },
    {
      label: 'Timeline',
      icon: Calendar,
      content: (
        <span className="text-xs text-neutral-600 dark:text-neutral-300">
          Created {formatDate(mission.created_at)}
          <br />
          Updated {formatDate(mission.updated_at)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={mission.title}
        subtitle={mission.business_domain}
        actions={
          <>
            <Link to={missionReportPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Executive Dashboard
            </Link>
            <Link to={editMissionPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      />

      {successMessage && (
        <Banner variant="success" className="mb-4">
          {successMessage}
        </Banner>
      )}
      {deleteError && (
        <Banner variant="danger" className="mb-4">
          {deleteError}
        </Banner>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map(({ label, icon: Icon, content }) => (
          <Card key={label}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
              <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            </div>
            <div className="mt-3">{content}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <Briefcase className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          Business Goal
        </h2>
        <div className="flex flex-col gap-5">
          {GOAL_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {label}
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                {mission[key] as string}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Datasets</h2>
          <DatasetUploader
            missionId={mission.id}
            onUploaded={(dataset) => {
              setDatasetBanner(`${dataset.original_filename} uploaded successfully.`)
              datasets.refetch()
            }}
          />
        </div>

        {datasetBanner && (
          <Banner variant="success" className="mb-4">
            {datasetBanner}
          </Banner>
        )}
        {datasetError && (
          <Banner variant="danger" className="mb-4">
            {datasetError}
          </Banner>
        )}

        {datasets.status === 'loading' && <Loading />}
        {datasets.status === 'error' && <Banner variant="danger">{datasets.message}</Banner>}
        {datasets.status === 'success' && datasets.data.length === 0 && (
          <EmptyState
            icon={Database}
            title="No datasets uploaded yet"
            description="Upload a CSV, XLSX, or JSON file to attach it to this mission."
          />
        )}
        {datasets.status === 'success' && datasets.data.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {datasets.data.map((dataset) => {
              const index = dataset.index
              return (
                <li key={dataset.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={datasetDetailsPath(dataset.id)}
                      className="block truncate text-sm font-medium text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
                    >
                      {dataset.original_filename}
                    </Link>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {dataset.file_type.toUpperCase()} · {formatFileSize(dataset.file_size)} ·{' '}
                      {formatDate(dataset.created_at)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        {index ? (
                          <Badge variant={ragIndexStatusBadgeVariant(index.status)}>
                            {ragIndexStatusLabel(index.status)}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Not Indexed</Badge>
                        )}
                      </span>
                      {index?.status === 'indexed' && (
                        <>
                          <span>{index.chunk_count} chunks</span>
                          <span>{index.embedding_model}</span>
                          {index.indexed_at && <span>Last indexed {formatDate(index.indexed_at)}</span>}
                        </>
                      )}
                      {index?.status === 'failed' && index.error_message && (
                        <span className="text-danger-600 dark:text-danger-400">{index.error_message}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant={datasetStatusBadgeVariant(dataset.upload_status)}>
                      {datasetStatusLabel(dataset.upload_status)}
                    </Badge>
                    {dataset.upload_status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleReindex(dataset)}
                        disabled={reindexingId === dataset.id}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        aria-label={`Re-index ${dataset.original_filename}`}
                        title="Re-index for RAG retrieval"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${reindexingId === dataset.id ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteDataset(dataset.id)}
                      disabled={deletingDatasetId === dataset.id}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400"
                      aria-label={`Delete ${dataset.original_filename}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <MissionAnalysisSection missionId={mission.id} />
    </div>
  )
}

export default MissionDetails
