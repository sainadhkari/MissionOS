import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-warning-50 px-4 py-2 text-sm text-warning-700 dark:bg-warning-950/60 dark:text-warning-300">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      You're offline. Some features may not work until your connection is restored.
    </div>
  )
}

export default OfflineBanner
