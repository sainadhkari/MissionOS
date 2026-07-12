import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Database, Eye, Inbox, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Banner from '../components/Banner'
import Badge from '../components/Badge'
import { ListCardSkeleton } from '../components/Skeleton'
import { buttonClasses } from '../components/Button'
import { ROUTES, missionDetailsPath, editMissionPath } from '../constants/routes'
import { useMissions } from '../hooks/useMissions'
import { useAllDatasets } from '../hooks/useAllDatasets'
import { useMissionAnalyses } from '../hooks/useMissionAnalyses'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import { missionPriorityBadgeVariant, missionPriorityLabel, missionStatusBadgeVariant, missionStatusLabel } from '../utils/mission'
import { averageConfidence, confidenceBadgeVariant } from '../utils/executiveDashboard'

function MissionHistory() {
  const location = useLocation()
  const missions = useMissions()
  const missionsData = missions.status === 'success' ? missions.data : null
  const datasetsState = useAllDatasets(missionsData)
  const analysesState = useMissionAnalyses(missionsData)

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

  function datasetCount(missionId: string): number {
    if (datasetsState.status !== 'success') return 0
    return datasetsState.data.filter((dataset) => dataset.mission_id === missionId).length
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

      {missions.status === 'loading' && <ListCardSkeleton count={4} />}

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {missions.data.map((mission) => {
            const analysis = analysesState.status === 'success' ? analysesState.data.get(mission.id) : undefined
            const confidence = analysis ? averageConfidence(analysis) : null
            const riskLevel = analysis?.risk_analysis?.overall_risk_level ?? null

            return (
              <div
                key={mission.id}
                className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={missionDetailsPath(mission.id)}
                    className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
                  >
                    {mission.title}
                  </Link>
                  <Badge variant={missionStatusBadgeVariant(mission.status)}>{missionStatusLabel(mission.status)}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{mission.business_domain}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={missionPriorityBadgeVariant(mission.priority)}>
                    {missionPriorityLabel(mission.priority)} priority
                  </Badge>
                  {confidence !== null && (
                    <Badge variant={confidenceBadgeVariant(confidence)}>
                      {Math.round(confidence * 100)}% confidence
                    </Badge>
                  )}
                  {riskLevel && <Badge variant="neutral">{riskLevel} risk</Badge>}
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                    {datasetCount(mission.id)} dataset{datasetCount(mission.id) === 1 ? '' : 's'}
                  </span>
                  <span>Updated {formatDate(mission.updated_at)}</span>
                </div>

                <div className="mt-4 flex items-center gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <Link
                    to={missionDetailsPath(mission.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    aria-label={`View ${mission.title}`}
                    title="View"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to={editMissionPath(mission.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    aria-label={`Edit ${mission.title}`}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(mission.id)}
                    disabled={deletingId === mission.id}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-danger-50 hover:text-danger-600 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400"
                    aria-label={`Delete ${mission.title}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MissionHistory
