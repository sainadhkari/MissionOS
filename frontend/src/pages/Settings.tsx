import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  BrainCircuit,
  Briefcase,
  Check,
  FileText,
  Info,
  LogOut,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Target,
  User,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Switch from '../components/Switch'
import Loading from '../components/Loading'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { authService } from '../services/auth'
import { ROUTES } from '../constants/routes'
import { APP_NAME } from '../constants/app'
import { formatDate } from '../utils/date'
import type { ThemePreference } from '../contexts/ThemeContext'

type TabId = 'profile' | 'appearance' | 'notifications' | 'ai' | 'security' | 'about'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'ai', label: 'AI Preferences', icon: BrainCircuit },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'about', label: 'About MissionOS', icon: Info },
]

const THEME_OPTIONS: { value: ThemePreference; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', description: 'Bright interface, best in well-lit rooms.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-glare interface, easier on the eyes at night.', icon: Moon },
  { value: 'system', label: 'System', description: 'Follows your OS setting automatically.', icon: Monitor },
]

const AGENTS = [
  {
    name: 'Business Analyst Agent',
    icon: Briefcase,
    description: 'Interprets the mission problem statement and datasets to surface key business opportunities and metrics.',
  },
  {
    name: 'Strategy Agent',
    icon: Target,
    description: 'Builds strategic objectives, an implementation roadmap, and KPIs from the business analysis.',
  },
  {
    name: 'Risk Agent',
    icon: ShieldCheck,
    description: 'Identifies critical risks, assumptions, and mitigations tied to the proposed strategy.',
  },
  {
    name: 'Executive Agent',
    icon: FileText,
    description: 'Synthesizes every prior stage into an executive summary with a final recommendation.',
  },
]

function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account, appearance, and MissionOS preferences." />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div key={activeTab} className="min-w-0 flex-1 animate-fade-in-up">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'ai' && <AiPreferencesTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab() {
  const currentUser = useCurrentUser()

  return (
    <Card>
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Profile</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Your account details, as registered with MissionOS.
      </p>

      {currentUser.status === 'loading' && <Loading />}
      {currentUser.status === 'error' && (
        <p className="mt-4 text-sm text-danger-600 dark:text-danger-400">{currentUser.message}</p>
      )}
      {currentUser.status === 'success' && (
        <dl className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">Full name</dt>
            <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {currentUser.data.full_name}
            </dd>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">Email</dt>
            <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{currentUser.data.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">Member since</dt>
            <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {formatDate(currentUser.data.created_at)}
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
        Profile editing isn't available yet — this view reflects exactly what MissionOS has on record.
      </p>
    </Card>
  )
}

function AppearanceTab() {
  const { preference, setPreference } = useTheme()

  return (
    <Card>
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Appearance</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Choose how MissionOS looks on this device.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => {
          const isSelected = preference === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-primary-500 bg-primary-50/60 dark:border-primary-600 dark:bg-primary-950/30'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <Icon
                  className={`h-5 w-5 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'}`}
                  aria-hidden="true"
                />
                {isSelected && <Check className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />}
              </div>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{description}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function NotificationsTab() {
  const { liveToastsEnabled, setLiveToastsEnabled, toast } = useToast()

  return (
    <Card>
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Control how MissionOS surfaces activity while you work.
      </p>

      <div className="mt-6 flex items-center justify-between gap-4 border-b border-neutral-100 pb-5 dark:border-neutral-800">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Pop-up notifications</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Show a toast in the corner for mission and dataset events. Events are always logged to the
            notification bell regardless of this setting.
          </p>
        </div>
        <Switch checked={liveToastsEnabled} onChange={setLiveToastsEnabled} label="Toggle pop-up notifications" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Test it</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Send a sample notification to see the current setting in action.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast('info', 'Test notification', { description: 'This is what MissionOS alerts look like.' })}
        >
          Send test
        </Button>
      </div>
    </Card>
  )
}

function AiPreferencesTab() {
  return (
    <Card>
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">AI Preferences</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Every mission runs through the same coordinated four-agent pipeline — here's what each stage does.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {AGENTS.map(({ name, icon: Icon, description }) => (
          <div key={name} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
        Per-mission model or prompt configuration isn't available yet — every mission uses this same pipeline.
      </p>
    </Card>
  )
}

function SecurityTab() {
  const navigate = useNavigate()

  function handleLogout() {
    authService.logout()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Security</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        MissionOS authenticates with a bearer token issued at login and stored only in this browser.
      </p>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Log out of this device</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Clears your session token from this browser. You'll need to sign in again to continue.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </Card>
  )
}

function AboutTab() {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">About {APP_NAME}</h2>
        <Badge variant="primary">Hackathon Project</Badge>
      </div>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
        MissionOS is an enterprise AI decision intelligence platform. Upload a dataset, describe a business
        problem, and a coordinated crew of AI agents turns it into a strategy, risk, and executive analysis
        your leadership team can act on.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {['React', 'FastAPI', 'PostgreSQL', 'CrewAI', 'LangChain', 'OpenAI'].map((tech) => (
          <span
            key={tech}
            className="rounded-md border border-neutral-200 px-3 py-1.5 text-center text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
          >
            {tech}
          </span>
        ))}
      </div>
    </Card>
  )
}

export default Settings
