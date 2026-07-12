import { CalendarClock, CheckCircle2, Circle } from 'lucide-react'
import { ChartCard } from '../Charts'
import { buildExecutionTimeline } from '../../utils/collaborationCenter'
import { formatDateTime } from '../../utils/date'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'
import type { Mission } from '../../types/Mission'

interface TimelineChartProps {
  mission: Mission
  datasets: Dataset[]
  analysis: MissionAnalysis | null
}

/** A horizontal strip reading of the same real execution timeline shown in
 * the AI Collaboration Center — a real timestamp wherever the backend
 * recorded one, "Completed" when we know a step finished but not exactly
 * when, "Not Available" when we don't know that much. */
function TimelineChart({ mission, datasets, analysis }: TimelineChartProps) {
  const entries = buildExecutionTimeline(mission, datasets, analysis)

  return (
    <ChartCard title="Mission Timeline" icon={CalendarClock} caption="Every stage from mission creation to report generation">
      <div className="flex gap-4 overflow-x-auto pb-2">
        {entries.map((entry) => {
          const known = entry.timestamp !== null || entry.completedFallback
          return (
            <div key={entry.label} className="flex min-w-[120px] shrink-0 flex-col items-start gap-1.5">
              <span
                className={`flex items-center gap-1 text-xs font-medium ${known ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-600'}`}
              >
                {known ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
                {entry.label}
              </span>
              <span className={`h-1.5 w-full rounded-full ${known ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                {entry.timestamp ? formatDateTime(entry.timestamp) : entry.completedFallback ? 'Completed' : 'Not Available'}
              </span>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

export default TimelineChart
