import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Database, FileText, History, LayoutDashboard, PlayCircle, PlusCircle, Settings, X } from 'lucide-react'
import { ROUTES } from '../../constants/routes'

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

const aiCenterItems: { label: string; icon: LucideIcon }[] = [
  { label: 'Mission Execution', icon: PlayCircle },
  { label: 'Executive Dashboard', icon: FileText },
]

const linkClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-primary-50 text-primary-700' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
  }`

const groupLabelClassName = 'px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`${
          isOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 left-0 z-50 w-64 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-6 lg:static lg:z-auto lg:flex lg:w-56`}
      >
        <button
          type="button"
          onClick={onClose}
          className="mb-4 ml-auto flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <nav className="flex flex-col gap-6">
          {navGroups.map((group, index) => (
            <div key={group.label ?? index}>
              {group.label && <p className={groupLabelClassName}>{group.label}</p>}
              <div className={`flex flex-col gap-1 ${group.label ? 'mt-1' : ''}`}>
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={linkClassName}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className={groupLabelClassName}>AI Center</p>
            <div className="mt-1 flex flex-col gap-1">
              {aiCenterItems.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-neutral-300"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-1 px-3 text-xs text-neutral-400">Opens from an active mission</p>
          </div>

          <div className="flex flex-col gap-1 border-t border-neutral-200 pt-4">
            <NavLink to={ROUTES.settings} className={linkClassName}>
              <Settings className="h-4 w-4" aria-hidden="true" />
              Settings
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
