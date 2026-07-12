// Hex values for the theme colors defined in tailwind.config.js
// (primary/info/warning/danger/success/neutral), since Recharts needs
// literal colors rather than Tailwind classes. Two shades per hue keep a
// multi-category chart (e.g. risk categories) readable without introducing
// a hue outside the existing design system.
export const CHART_PALETTE = [
  '#6366f1', // primary-500
  '#0ea5e9', // info-500
  '#f59e0b', // warning-500
  '#ef4444', // danger-500
  '#10b981', // success-500
  '#94a3b8', // neutral-400
  '#a5b4fc', // primary-300
  '#7dd3fc', // info-300
  '#fcd34d', // warning-300
  '#fca5a5', // danger-300
  '#6ee7b7', // success-300
  '#cbd5e1', // neutral-300
]

export const CHART_GRID_COLOR = '#e2e8f0' // neutral-200
export const CHART_AXIS_TEXT_COLOR = '#64748b' // neutral-500
