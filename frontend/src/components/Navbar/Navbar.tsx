import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  Boxes,
  Check,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sun,
  User,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { APP_NAME } from '../../constants/app'
import { ROUTES, missionDetailsPath } from '../../constants/routes'
import { authService } from '../../services/auth'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useMissions } from '../../hooks/useMissions'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../../contexts/ToastContext'
import { missionStatusBadgeVariant, missionStatusLabel } from '../../utils/mission'
import Badge from '../Badge'

interface NavbarProps {
  onMenuClick: () => void
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

function timeAgo(timestampMs: number): string {
  const seconds = Math.floor((Date.now() - timestampMs) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function Navbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const missions = useMissions()
  const { preference, setPreference } = useTheme()
  const { history, unreadCount, markAllRead } = useToast()

  const [isProfileOpen, setProfileOpen] = useState(false)
  const [isNotificationsOpen, setNotificationsOpen] = useState(false)
  const [isSearchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const profileRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false)
      if (notificationsRef.current && !notificationsRef.current.contains(target)) setNotificationsOpen(false)
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query || missions.status !== 'success') return []
    return missions.data
      .filter(
        (mission) =>
          mission.title.toLowerCase().includes(query) || mission.business_domain.toLowerCase().includes(query)
      )
      .slice(0, 6)
  }, [searchQuery, missions])

  function handleLogout() {
    authService.logout()
    navigate(ROUTES.login, { replace: true })
  }

  function handleSelectResult(missionId: string) {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(missionDetailsPath(missionId))
  }

  function handleOpenNotifications() {
    const next = !isNotificationsOpen
    setNotificationsOpen(next)
    if (next && unreadCount > 0) markAllRead()
  }

  const displayName = currentUser.status === 'success' ? currentUser.data.full_name : 'Loading…'
  const displayEmail = currentUser.status === 'success' ? currentUser.data.email : ''

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 shadow-xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80 print:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link to={ROUTES.dashboard} className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
              <Boxes className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden text-base font-semibold text-neutral-900 dark:text-neutral-50 sm:inline">
              {APP_NAME}
            </span>
          </Link>
        </div>

        <div ref={searchRef} className="relative hidden max-w-md flex-1 md:block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search missions"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search missions…"
            className="h-9 w-full rounded-md border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:bg-neutral-900"
          />

          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-dropdown dark:border-neutral-800 dark:bg-neutral-900">
              {searchResults.length === 0 ? (
                <p className="px-3 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                  No missions match &ldquo;{searchQuery.trim()}&rdquo;.
                </p>
              ) : (
                searchResults.map((mission) => (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => handleSelectResult(mission.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {mission.title}
                      </span>
                      <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {mission.business_domain}
                      </span>
                    </span>
                    <Badge variant={missionStatusBadgeVariant(mission.status)} className="shrink-0">
                      {missionStatusLabel(mission.status)}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={isNotificationsOpen}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger-500" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-80 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-dropdown dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-100 px-3.5 py-2.5 dark:border-neutral-800">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="px-3.5 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      You&apos;re all caught up — activity will show up here.
                    </p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="border-b border-neutral-50 px-3.5 py-2.5 last:border-0 dark:border-neutral-800/60"
                      >
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{item.description}</p>
                        )}
                        <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                          {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-1.5 rounded-md py-1 pl-1 pr-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                {currentUser.status === 'success' ? getInitials(currentUser.data.full_name) : <User className="h-4 w-4" />}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-neutral-400 sm:block" aria-hidden="true" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-64 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-dropdown dark:border-neutral-800 dark:bg-neutral-900">
                <div className="border-b border-neutral-100 px-3.5 py-3 dark:border-neutral-800">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {displayName}
                  </p>
                  {displayEmail && (
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{displayEmail}</p>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    to={ROUTES.dashboard}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <LayoutDashboard className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    Dashboard
                  </Link>
                  <Link
                    to={ROUTES.settings}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <SettingsIcon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    Settings
                  </Link>
                </div>

                <div className="border-t border-neutral-100 py-1 dark:border-neutral-800">
                  <p className="px-3.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Theme
                  </p>
                  {(
                    [
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPreference(value)}
                      className="flex w-full items-center justify-between gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                        {label}
                      </span>
                      {preference === value && <Check className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-neutral-100 py-1 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-950/40"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
