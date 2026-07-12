interface ConfidenceGaugeProps {
  /** 0..1 */
  value: number
  label?: string
}

const SIZE = 160
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = Math.PI * RADIUS

function trackColor(value: number): string {
  if (value >= 0.8) return 'stroke-success-500'
  if (value >= 0.5) return 'stroke-warning-500'
  return 'stroke-danger-500'
}

/** A semicircular gauge (0..1) rendered as a half-donut, purely with SVG so
 * it stays crisp and theme-aware without a charting library. */
function ConfidenceGauge({ value, label = 'AI Confidence' }: ConfidenceGaugeProps) {
  const clamped = Math.max(0, Math.min(1, value))
  const dashOffset = CIRCUMFERENCE * (1 - clamped)

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE / 2 + STROKE / 2} viewBox={`0 0 ${SIZE} ${SIZE / 2 + STROKE / 2}`}>
        <path
          d={`M ${STROKE / 2} ${SIZE / 2} A ${RADIUS} ${RADIUS} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-neutral-100 dark:stroke-neutral-800"
        />
        <path
          d={`M ${STROKE / 2} ${SIZE / 2} A ${RADIUS} ${RADIUS} 0 0 1 ${SIZE - STROKE / 2} ${SIZE / 2}`}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className={`transition-[stroke-dashoffset] duration-1000 ease-out ${trackColor(clamped)}`}
        />
      </svg>
      <div className="-mt-8 flex flex-col items-center">
        <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{Math.round(clamped * 100)}%</span>
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
    </div>
  )
}

export default ConfidenceGauge
