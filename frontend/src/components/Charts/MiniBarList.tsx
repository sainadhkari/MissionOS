export interface MiniBarListEntry {
  label: string
  value: number
  /** 0..100 -- pre-normalized so callers control the scale (share of
   * total, percent, etc.) rather than this component guessing a max. */
  percent: number
  colorClassName?: string
  caption?: string
}

interface MiniBarListProps {
  entries: MiniBarListEntry[]
  valueSuffix?: string
}

const DEFAULT_COLORS = ['bg-primary-500', 'bg-info-500', 'bg-warning-500', 'bg-success-500', 'bg-violet-500', 'bg-neutral-400']

/** A horizontal bar-list — label, animated fill bar, and value — shared by
 * every "distribution"/"contribution"/"category" chart in the analytics
 * suite (AgentContributionChart, RecommendationCategoryChart,
 * RiskDistributionChart, EvidenceSourcesChart, ...) instead of each
 * reimplementing its own `<div style={{width}}>` bar. */
function MiniBarList({ entries, valueSuffix = '' }: MiniBarListProps) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, index) => (
        <div key={entry.label}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-300">{entry.label}</span>
            <span className="shrink-0 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {entry.value}
              {valueSuffix}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${entry.colorClassName ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}`}
              style={{ width: `${Math.max(0, Math.min(100, entry.percent))}%` }}
            />
          </div>
          {entry.caption && <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">{entry.caption}</p>}
        </div>
      ))}
    </div>
  )
}

export default MiniBarList
