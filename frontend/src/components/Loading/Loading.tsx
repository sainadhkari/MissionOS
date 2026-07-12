import { Loader2 } from 'lucide-react'

function Loading() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-neutral-500 dark:text-neutral-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Loading...
    </div>
  )
}

export default Loading
