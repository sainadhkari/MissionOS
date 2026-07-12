import { useTheme } from '../contexts/ThemeContext'
import {
  CHART_AXIS_TEXT_COLOR,
  CHART_AXIS_TEXT_COLOR_DARK,
  CHART_GRID_COLOR,
  CHART_GRID_COLOR_DARK,
  CHART_PALETTE,
  CHART_TOOLTIP_BG_DARK,
} from '../utils/chartColors'

/** Centralizes the isDark → {grid, axis, tooltip} color lookup that used to
 * be repeated inline in every chart component (`OpportunitiesBarChart`,
 * `RiskCategoryChart`, `DatasetSummaryChart`, ...). New chart components
 * should read colors from here instead of re-deriving them. */
export function useChartTheme() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return {
    isDark,
    palette: CHART_PALETTE,
    gridColor: isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR,
    axisColor: isDark ? CHART_AXIS_TEXT_COLOR_DARK : CHART_AXIS_TEXT_COLOR,
    tooltipStyle: {
      borderRadius: 8,
      borderColor: isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR,
      fontSize: 12,
      backgroundColor: isDark ? CHART_TOOLTIP_BG_DARK : '#ffffff',
      color: isDark ? '#e2e8f0' : '#0f172a',
    } as const,
    tooltipCursor: { fill: isDark ? '#1e293b' : '#f8fafc' },
    tickStyle: { fontSize: 12, fill: isDark ? CHART_AXIS_TEXT_COLOR_DARK : CHART_AXIS_TEXT_COLOR },
    legendStyle: { fontSize: 12, color: isDark ? '#cbd5e1' : '#334155' },
  }
}
