import { Link } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  Bot,
  Database,
  History,
  Inbox,
  ListTodo,
  Plus,
  Server,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import { buttonClasses } from '../components/Button'
import { ROUTES } from '../constants/routes'
import type { Mission } from '../types/Mission'
import type { Activity } from '../types/Activity'

const recentMissions: Mission[] = []
const recentActivity: Activity[] = []

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

const statusCards = [
  { label: 'Active Missions', value: '—', icon: ListTodo },
  { label: 'AI Agents', value: 'Ready', icon: Bot },
  { label: 'Data Sources', value: '—', icon: Database },
  { label: 'System', value: 'Healthy', icon: Server },
]

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Welcome to MissionOS"
        subtitle="Your enterprise AI decision operating system — plan, launch, and track AI-assisted missions across the business."
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map(({ to, label, description, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-card hover:border-primary-200 hover:bg-primary-50/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-medium text-neutral-900">{label}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500">{label}</span>
              <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-neutral-900">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-neutral-900">Recent Missions</h2>
          {recentMissions.length === 0 && (
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
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-neutral-900">Recent Activity</h2>
          {recentActivity.length === 0 && (
            <EmptyState icon={ActivityIcon} title="No recent activity" />
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-sm font-semibold text-neutral-900">Data Status</h2>
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
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
