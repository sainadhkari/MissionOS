import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Eye, Inbox, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import Badge from '../components/Badge'
import { Table, TableBody, TableHeader, TableHeaderCell, TableRow, TableCell } from '../components/Table'
import { buttonClasses } from '../components/Button'
import { ROUTES, missionDetailsPath, editMissionPath } from '../constants/routes'
import { useMissions } from '../hooks/useMissions'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import { missionStatusBadgeVariant, missionStatusLabel } from '../utils/mission'

function MissionHistory() {
  const location = useLocation()
  const missions = useMissions()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(
    (location.state as { deleted?: boolean } | null)?.deleted ? 'Mission deleted.' : null
  )

  useEffect(() => {
    if (!banner) return
    const timeout = setTimeout(() => setBanner(null), 4000)
    return () => clearTimeout(timeout)
  }, [banner])

  async function handleDelete(missionId: string) {
    if (!window.confirm('Delete this mission? This cannot be undone.')) return

    setActionError(null)
    setDeletingId(missionId)
    try {
      await missionService.remove(missionId)
      setBanner('Mission deleted.')
      missions.refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete mission.'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Mission History"
        subtitle="Review and manage every mission you've created."
        actions={
          <Link to={ROUTES.createMission} className={buttonClasses('primary', 'sm')}>
            New Mission
          </Link>
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

      {missions.status === 'loading' && <Loading />}

      {missions.status === 'error' && <Banner variant="danger">{missions.message}</Banner>}

      {missions.status === 'success' && missions.data.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="No missions yet"
          description="Create your first mission to see it here."
          action={
            <Link to={ROUTES.createMission} className={buttonClasses('outline', 'sm')}>
              New Mission
            </Link>
          }
        />
      )}

      {missions.status === 'success' && missions.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Mission</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missions.data.map((mission) => (
              <TableRow key={mission.id}>
                <TableCell>
                  <Link
                    to={missionDetailsPath(mission.id)}
                    className="font-medium text-neutral-900 hover:text-primary-600"
                  >
                    {mission.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={missionStatusBadgeVariant(mission.status)}>
                    {missionStatusLabel(mission.status)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(mission.created_at)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link
                      to={missionDetailsPath(mission.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                      aria-label={`View ${mission.title}`}
                      title="View"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to={editMissionPath(mission.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                      aria-label={`Edit ${mission.title}`}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(mission.id)}
                      disabled={deletingId === mission.id}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-50"
                      aria-label={`Delete ${mission.title}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default MissionHistory
