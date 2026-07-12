import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Boxes, ClipboardList, Database, FileText, FlaskConical, History, LayoutDashboard, Network, PlayCircle, PlusCircle, Settings, X } from 'lucide-react'
import {
  ROUTES,
  aiCollaborationCenterPath,
  executiveReportPath,
  missionDetailsPath,
  missionReportPath,
  scenarioSimulatorPath,
} from '../../constants/routes'
import { useToast } from '../../contexts/ToastContext'
import { APP_NAME } from '../../constants/app'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  { items: [{ to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Mission Center',
    items: [
      { to: ROUTES.createMission, label: 'Create Mission', icon: PlusCircle },
      { to: ROUTES.missionHistory, label: 'Mission History', icon: History },
    ],
  },
  {
    label: 'Data Center',
    items: [{ to: ROUTES.dataLibrary, label: 'Data Library', icon: Database }],
  },
]

const linkClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/50 dark:text-primary-300'
      : 'border-transparent text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
  }`

const groupLabelClassName = 'px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

/** Pulls a mission id out of any `/missions/:missionId(...)` route so the
 * AI Center links can point at the mission currently in view. */
function useCurrentMissionId(): string | null {
  const location = useLocation()
  const match = location.pathname.match(/^\/missions\/([^/]+)/)
  if (!match || match[1] === 'new' || match[1] === 'history') return null
  return match[1]!
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const currentMissionId = useCurrentMissionId()
  const navigate = useNavigate()
  const { toast } = useToast()

  const aiCenterItems: { label: string; icon: LucideIcon; to: string | null; explanation: string }[] = [
    {
      label: 'Mission Execution',
      icon: PlayCircle,
      to: currentMissionId ? missionDetailsPath(currentMissionId) : null,
      explanation: 'Open a mission first to view its live AI execution status.',
    },
    {
      label: 'Executive Dashboard',
      icon: FileText,
      to: currentMissionId ? missionReportPath(currentMissionId) : null,
      explanation: 'Open a mission first, then run analysis to unlock its executive report.',
    },
    {
      label: 'AI Collaboration Center',
      icon: Network,
      to: currentMissionId ? aiCollaborationCenterPath(currentMissionId) : null,
      explanation: 'Open a mission first to watch its AI agents collaborate.',
    },
    {
      label: 'Scenario Simulator',
      icon: FlaskConical,
      to: currentMissionId ? scenarioSimulatorPath(currentMissionId) : null,
      explanation: 'Open a mission first, then run analysis to explore what-if scenarios.',
    },
    {
      label: 'Executive Report',
      icon: ClipboardList,
      to: currentMissionId ? executiveReportPath(currentMissionId) : null,
      explanation: 'Open a mission first, then run analysis to generate its executive report.',
    },
  ]

  function handleAiCenterClick(item: (typeof aiCenterItems)[number]) {
    if (item.to) {
      navigate(item.to)
      onClose()
      return
    }
    toast('info', `${item.label} is unavailable`, { description: item.explanation })
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`${
          isOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 left-0 z-50 h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-5 transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-950 lg:relative lg:z-auto lg:flex lg:h-screen lg:w-60 print:hidden`}
      >
        <div className="mb-6 flex items-center justify-between px-1">
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-glow">
              <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{APP_NAME}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto" aria-label="Primary">
          {navGroups.map((group, index) => (
            <div key={group.label ?? index} className={index > 0 ? 'border-t border-neutral-100 pt-5 dark:border-neutral-800/60' : ''}>
              {group.label && <p className={groupLabelClassName}>{group.label}</p>}
              <div className={`flex flex-col gap-0.5 ${group.label ? 'mt-2' : ''}`}>
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={linkClassName} onClick={onClose}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-neutral-100 pt-5 dark:border-neutral-800/60">
            <p className={groupLabelClassName}>AI Center</p>
            <div className="mt-2 flex flex-col gap-0.5">
              {aiCenterItems.map((item) => {
                const isEnabled = item.to !== null
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleAiCenterClick(item)}
                    className={`flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                      isEnabled
                        ? 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                        : 'text-neutral-400 hover:bg-neutral-50 dark:text-neutral-600 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
            {!currentMissionId && (
              <p className="mt-1.5 px-3 text-xs text-neutral-400 dark:text-neutral-500">
                Opens once a mission is in view
              </p>
            )}
          </div>
        </nav>

        <div className="flex flex-col gap-1 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <NavLink to={ROUTES.settings} className={linkClassName} onClick={onClose}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
