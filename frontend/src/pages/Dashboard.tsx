import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  CheckCircle2,
  Database,
  FileEdit,
  History,
  Inbox,
  ListTodo,
  Loader2,
  Plus,
  Server,
  UploadCloud,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import AnimatedCounter from '../components/AnimatedCounter'
import { CardSkeleton, KpiGridSkeleton } from '../components/Skeleton'
import { buttonClasses } from '../components/Button'
import { ROUTES, missionDetailsPath } from '../constants/routes'
import { useHealthCheck } from '../hooks/useHealthCheck'
import { useMissions } from '../hooks/useMissions'
import { useAllDatasets } from '../hooks/useAllDatasets'
import { formatDate } from '../utils/date'
import { formatFileSize } from '../utils/dataset'
import { missionStatusBadgeVariant, missionStatusLabel } from '../utils/mission'
import { computeDatasetQuality } from '../utils/executiveDashboard'

const quickActions = [
  {
    to: ROUTES.createMission,
    label: 'New Mission',
    description: 'Start a new AI-assisted mission.',
    icon: Plus,
  },
  {
    to: ROUTES.dataLibrary,
    label: 'Data Library',
    description: 'Manage connected datasets.',
    icon: Database,
  },
  {
    to: ROUTES.missionHistory,
    label: 'Mission History',
    description: 'Review past missions.',
    icon: History,
  },
]

interface ActivityEntry {
  id: string
  message: string
  timestamp: string
  href: string
}

const STAT_ACCENT_CLASSES: Record<'primary' | 'neutral' | 'info' | 'success', string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400',
  neutral: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  info: 'bg-info-50 text-info-600 dark:bg-info-950/60 dark:text-info-400',
  success: 'bg-success-50 text-success-600 dark:bg-success-950/60 dark:text-success-400',
}

function Dashboard() {
  const backendStatus = useHealthCheck()
  const missions = useMissions()
  const missionsData = missions.status === 'success' ? missions.data : null
  const datasetsState = useAllDatasets(missionsData)

  const stats =
    missions.status === 'success'
      ? {
          total: missions.data.length,
          draft: missions.data.filter((m) => m.status === 'draft').length,
          processing: missions.data.filter((m) => m.status === 'processing').length,
          completed: missions.data.filter((m) => m.status === 'completed').length,
        }
      : null

  const statCards = [
    { label: 'Total Missions', value: stats?.total, icon: ListTodo, accent: 'primary' as const },
    { label: 'Draft Missions', value: stats?.draft, icon: FileEdit, accent: 'neutral' as const },
    { label: 'Processing', value: stats?.processing, icon: Loader2, accent: 'info' as const, spin: true },
    { label: 'Completed Missions', value: stats?.completed, icon: CheckCircle2, accent: 'success' as const },
  ]

  const recentMissions = missions.status === 'success' ? missions.data.slice(0, 5) : []

  const recentActivity: ActivityEntry[] = useMemo(() => {
    const missionEvents: ActivityEntry[] =
      missions.status === 'success'
        ? missions.data.map((mission) => ({
            id: `mission-${mission.id}`,
            message:
              mission.status === 'completed'
                ? `Analysis completed for "${mission.title}"`
                : mission.status === 'processing'
                  ? `"${mission.title}" is being analyzed`
                  : `Mission "${mission.title}" was created`,
            timestamp: mission.updated_at,
            href: missionDetailsPath(mission.id),
          }))
        : []

    const datasetEvents: ActivityEntry[] =
      datasetsState.status === 'success'
        ? datasetsState.data.map((dataset) => ({
            id: `dataset-${dataset.id}`,
            message: `Dataset "${dataset.original_filename}" uploaded to "${dataset.missionTitle}"`,
            timestamp: dataset.created_at,
            href: missionDetailsPath(dataset.mission_id),
          }))
        : []

    return [...missionEvents, ...datasetEvents]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 6)
  }, [missions, datasetsState])

  const datasets = datasetsState.status === 'success' ? datasetsState.data : []
  const totalStorage = datasets.reduce((sum, dataset) => sum + dataset.file_size, 0)
  const dataQuality = computeDatasetQuality(datasets)

  return (
    <div>
      <PageHeader
        title="Welcome to MissionOS"
        subtitle="Your enterprise AI decision operating system — plan, launch, and track AI-assisted missions across the business."
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map(({ to, label, description, icon: Icon }, index) => (
            <Link
              key={to}
              to={to}
              className="flex animate-fade-in-up items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-primary-800"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {missions.status === 'error' && (
        <Banner variant="danger" className="mt-6">
          {missions.message}
        </Banner>
      )}

      {missions.status === 'loading' ? (
        <div className="mt-6">
          <KpiGridSkeleton />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ label, value, icon: Icon, accent, spin }, index) => (
            <Card
              key={label}
              className="animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {label}
                </span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-md ${STAT_ACCENT_CLASSES[accent]}`}>
                  <Icon className={`h-4 w-4 ${spin && (value ?? 0) > 0 ? 'animate-spin' : ''}`} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                <AnimatedCounter value={value ?? 0} />
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Card className="animate-fade-in-up" style={{ animationDelay: '240ms', animationFillMode: 'backwards' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Backend Status</span>
            <Server className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="mt-3">
            {backendStatus === 'loading' && <Loading />}
            {backendStatus === 'online' && <Badge variant="success">Healthy</Badge>}
            {backendStatus === 'offline' && <Badge variant="danger">Backend Offline</Badge>}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="animate-fade-in-up transition-shadow duration-200 hover:shadow-md"
          style={{ animationDelay: '280ms', animationFillMode: 'backwards' }}
        >
          <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Missions</h2>
          {missions.status === 'loading' && <Loading />}
          {missions.status === 'success' && recentMissions.length === 0 && (
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
          {missions.status === 'success' && recentMissions.length > 0 && (
            <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
              {recentMissions.map((mission) => (
                <li key={mission.id} className="-mx-2 first:pt-0 last:pb-0">
                  <Link
                    to={missionDetailsPath(mission.id)}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-neutral-50 hover:text-primary-600 dark:hover:bg-neutral-800/60 dark:hover:text-primary-400"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {mission.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">
                        {formatDate(mission.created_at)}
                      </span>
                    </span>
                    <Badge variant={missionStatusBadgeVariant(mission.status)}>
                      {missionStatusLabel(mission.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className="animate-fade-in-up transition-shadow duration-200 hover:shadow-md"
          style={{ animationDelay: '320ms', animationFillMode: 'backwards' }}
        >
          <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent Activity</h2>
          {(missions.status === 'loading' || datasetsState.status === 'loading') && <Loading />}
          {missions.status === 'success' && recentActivity.length === 0 && (
            <EmptyState icon={ActivityIcon} title="No recent activity" />
          )}
          {recentActivity.length > 0 && (
            <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="-mx-2 first:pt-0 last:pb-0">
                  <Link
                    to={entry.href}
                    className="block rounded-md px-2 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-primary-600 dark:text-neutral-300 dark:hover:bg-neutral-800/60 dark:hover:text-primary-400"
                  >
                    {entry.message}
                    <span className="mt-0.5 block text-xs text-neutral-400 dark:text-neutral-500">
                      {formatDate(entry.timestamp)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className="animate-fade-in-up transition-shadow duration-200 hover:shadow-md"
          style={{ animationDelay: '360ms', animationFillMode: 'backwards' }}
        >
          <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Data Status</h2>
          {datasetsState.status === 'loading' && <CardSkeleton className="border-0 p-0" />}
          {datasetsState.status === 'success' && datasets.length === 0 && (
            <EmptyState
              icon={Database}
              title="No data sources connected"
              description="Connect a dataset in the Data Library to see status here."
              action={
                <Link to={ROUTES.dataLibrary} className={buttonClasses('outline', 'sm')}>
                  Go to Data Library
                </Link>
              }
            />
          )}
          {datasetsState.status === 'success' && datasets.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                  <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
                  Datasets
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  <AnimatedCounter value={datasets.length} />
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Storage Used</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatFileSize(totalStorage)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Data Quality</span>
                {dataQuality ? (
                  <Badge variant={dataQuality.variant}>
                    {dataQuality.scorePercent}% · {dataQuality.label}
                  </Badge>
                ) : (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">Pending</span>
                )}
              </div>
              <Link to={ROUTES.dataLibrary} className={`${buttonClasses('outline', 'sm')} mt-1 w-full`}>
                Open Data Library
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
