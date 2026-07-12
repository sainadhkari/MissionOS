import { GitCompare } from 'lucide-react'
import { ChartCard } from '../Charts'
import type { ScenarioBaseline, ScenarioProjection } from '../../utils/scenarioSimulation'
import type { RecommendationChange } from '../../utils/scenarioSimulation'

export interface CompareColumn {
  label: string
  projection: ScenarioProjection
  recommendationChanges: RecommendationChange[]
}

interface ScenarioCompareTableProps {
  baseline: ScenarioBaseline
  columns: CompareColumn[]
}

function formatPercent(value: number | null): string {
  return value !== null ? `${value}%` : 'Not Available'
}

function recommendationSummary(changes: RecommendationChange[]): string {
  if (changes.length === 0) return 'Not Available'
  const up = changes.filter((c) => c.shift === 'up').length
  const down = changes.filter((c) => c.shift === 'down').length
  const unchanged = changes.length - up - down
  return `${up} ↑ / ${down} ↓ / ${unchanged} unchanged`
}

/** Compares "Current Analysis" (the real baseline) against one or more
 * scenarios side by side — reused both for the main Current vs. Scenario
 * view and for comparing multiple saved scenarios against each other, so
 * the comparison logic only lives in one place. */
function ScenarioCompareTable({ baseline, columns }: ScenarioCompareTableProps) {
  const rows: { label: string; baselineValue: string; columnValues: string[] }[] = [
    {
      label: 'Revenue (index, 100 = baseline)',
      baselineValue: '100',
      columnValues: columns.map((c) => String(c.projection.revenueIndex)),
    },
    {
      label: 'Risk',
      baselineValue: formatPercent(baseline.riskPercent),
      columnValues: columns.map((c) => formatPercent(c.projection.riskPercent)),
    },
    {
      label: 'Confidence',
      baselineValue: formatPercent(baseline.confidencePercent),
      columnValues: columns.map((c) => formatPercent(c.projection.confidencePercent)),
    },
    {
      label: 'Dataset Health',
      baselineValue: formatPercent(baseline.datasetQualityPercent),
      columnValues: columns.map(() => formatPercent(baseline.datasetQualityPercent)),
    },
    {
      label: 'Business Health',
      baselineValue: '50%',
      columnValues: columns.map((c) => formatPercent(c.projection.businessImpactPercent)),
    },
    {
      label: 'Deployment Readiness',
      baselineValue: formatPercent(baseline.deploymentReadinessPercent),
      columnValues: columns.map((c) => formatPercent(c.projection.deploymentReadinessPercent)),
    },
    {
      label: 'Recommendation Priority',
      baselineValue: 'Not Available',
      columnValues: columns.map((c) => recommendationSummary(c.recommendationChanges)),
    },
  ]

  return (
    <ChartCard title="Current vs. Scenario" icon={GitCompare} caption="Every scenario column is a projection, not a new AI analysis">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Metric</th>
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Current Analysis</th>
              {columns.map((column) => (
                <th key={column.label} className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-2.5 pr-4 font-medium text-neutral-700 dark:text-neutral-300">{row.label}</td>
                <td className="py-2.5 pr-4 text-neutral-500 dark:text-neutral-400">{row.baselineValue}</td>
                {row.columnValues.map((value, index) => (
                  <td key={index} className="py-2.5 pr-4 font-semibold text-neutral-900 dark:text-neutral-100">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

export default ScenarioCompareTable
