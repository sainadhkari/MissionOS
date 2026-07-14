import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ToastVariant = 'success' | 'danger' | 'info' | 'warning'

export interface ToastRecord {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  createdAt: number
  read: boolean
}

interface ToastOptions {
  description?: string
  /** Milliseconds before auto-dismiss. Set to 0 to require manual dismissal. */
  durationMs?: number
}

interface ToastContextValue {
  toast: (variant: ToastVariant, title: string, options?: ToastOptions) => void
  /** Every toast ever fired this session, newest first -- backs the
   * notification bell. Capped so it can't grow unbounded in a long session. */
  history: ToastRecord[]
  unreadCount: number
  markAllRead: () => void
  clearHistory: () => void
  /** When false, events still land in `history` for the notification bell,
   * but no pop-up is shown -- the Settings > Notifications toggle controls
   * this directly, so it has a real, observable effect. */
  liveToastsEnabled: boolean
  setLiveToastsEnabled: (enabled: boolean) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_HISTORY = 30
const DEFAULT_DURATION_MS = 5000
const LIVE_TOASTS_ENABLED_KEY = 'missionos_live_notifications_enabled'

function readLiveToastsEnabled(): boolean {
  return localStorage.getItem(LIVE_TOASTS_ENABLED_KEY) !== 'false'
}

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  danger: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-success-200 bg-success-50 text-success-800 dark:border-success-800/40 dark:bg-success-950/60 dark:text-success-300',
  danger: 'border-danger-200 bg-danger-50 text-danger-800 dark:border-danger-800/40 dark:bg-danger-950/60 dark:text-danger-300',
  info: 'border-info-200 bg-info-50 text-info-800 dark:border-info-800/40 dark:bg-info-950/60 dark:text-info-300',
  warning: 'border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-800/40 dark:bg-warning-950/60 dark:text-warning-300',
}

const VARIANT_ICON_CLASSES: Record<ToastVariant, string> = {
  success: 'text-success-500',
  danger: 'text-danger-500',
  info: 'text-info-500',
  warning: 'text-warning-500',
}

type LiveToast = ToastRecord

export function ToastProvider({ children }: PropsWithChildren) {
  const [liveToasts, setLiveToasts] = useState<LiveToast[]>([])
  const [history, setHistory] = useState<ToastRecord[]>([])
  const [liveToastsEnabled, setLiveToastsEnabledState] = useState(readLiveToastsEnabled)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timersOnMount = timers.current
    return () => {
      timersOnMount.forEach((timer) => clearTimeout(timer))
      timersOnMount.clear()
    }
  }, [])

  const setLiveToastsEnabled = useCallback((enabled: boolean) => {
    setLiveToastsEnabledState(enabled)
    localStorage.setItem(LIVE_TOASTS_ENABLED_KEY, String(enabled))
  }, [])

  const dismiss = useCallback((id: string) => {
    setLiveToasts((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (variant: ToastVariant, title: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const record: ToastRecord = {
        id,
        variant,
        title,
        description: options?.description,
        createdAt: Date.now(),
        read: false,
      }

      setHistory((current) => [record, ...current].slice(0, MAX_HISTORY))

      if (!liveToastsEnabled) return

      setLiveToasts((current) => [...current, record])
      const duration = options?.durationMs ?? DEFAULT_DURATION_MS
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }
    },
    [dismiss, liveToastsEnabled]
  )

  const unreadCount = useMemo(() => history.filter((item) => !item.read).length, [history])

  const markAllRead = useCallback(() => {
    setHistory((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const value = useMemo(
    () => ({ toast, history, unreadCount, markAllRead, clearHistory, liveToastsEnabled, setLiveToastsEnabled }),
    [toast, history, unreadCount, markAllRead, clearHistory, liveToastsEnabled, setLiveToastsEnabled]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {liveToasts.map((item) => {
          const Icon = VARIANT_ICON[item.variant]
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border p-4 shadow-dropdown backdrop-blur-sm ${VARIANT_CLASSES[item.variant]}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${VARIANT_ICON_CLASSES[item.variant]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description && <p className="mt-0.5 text-xs opacity-90">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
