interface SkeletonProps {
  className?: string
}

/** A single shimmering placeholder block. Compose these into page-specific
 * skeleton layouts (see `CardSkeleton`/`TableSkeleton` below) rather than
 * reaching for a generic full-page spinner on every data-fetching page. */
function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer rounded-md bg-neutral-200 bg-[length:400px_100%] bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:bg-neutral-800 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 ${className}`}
      aria-hidden="true"
    />
  )
}

function CardSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}

function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
}

function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[10rem]" />
        </td>
      ))}
    </tr>
  )
}

function ListCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, CardSkeleton, KpiGridSkeleton, TableRowSkeleton, ListCardSkeleton }
export default Skeleton
