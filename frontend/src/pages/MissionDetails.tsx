import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import Button, { buttonClasses } from '../components/Button'
import { ROUTES, editMissionPath } from '../constants/routes'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import { missionPriorityBadgeVariant, missionPriorityLabel, missionStatusBadgeVariant, missionStatusLabel } from '../utils/mission'
import type { Mission } from '../types/Mission'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; mission: Mission }

const DETAIL_FIELDS: { key: keyof Mission; label: string }[] = [
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

  const { mission } = state

  return (
    <div>
      <PageHeader
        title={mission.title}
        subtitle={mission.business_domain}
        actions={
          <>
            <Link to={editMissionPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
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

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={missionStatusBadgeVariant(mission.status)}>
            {missionStatusLabel(mission.status)}
          </Badge>
          <Badge variant={missionPriorityBadgeVariant(mission.priority)}>
            {missionPriorityLabel(mission.priority)} priority
          </Badge>
          <span className="text-xs text-neutral-500">
            Created {formatDate(mission.created_at)} · Updated {formatDate(mission.updated_at)}
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          {DETAIL_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {label}
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {mission[key] as string}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default MissionDetails
