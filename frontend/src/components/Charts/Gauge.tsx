interface GaugeProps {
  /** 0..100 */
  value: number | null
  label: string
  sublabel?: string
  size?: number
  /** When true, low values are colored green and high values red (for
   * "lower is better" metrics like risk) instead of the default. */
  inverted?: boolean
}

function colorFor(value: number, inverted: boolean): string {
  const good = inverted ? value <= 33 : value >= 80
  const warn = inverted ? value <= 66 : value >= 50
  if (good) return 'stroke-success-500'
  if (warn) return 'stroke-warning-500'
  return 'stroke-danger-500'
}

/** The generic semicircular gauge every named *Gauge component in the
 * analytics suite (BusinessHealthGauge, RiskGauge, DeploymentReadinessGauge,
 * MissionHealthScore, DecisionStrengthGauge, ...) renders through — a single
 * primitive instead of copy-pasting the SVG arc math per metric. `value:
 * null` renders the shared "Not Available" treatment inline rather than a
 * misleading empty gauge. */
function Gauge({ value, label, sublabel, size = 160, inverted = false }: GaugeProps) {
  const stroke = size * 0.0875
  const radius = (size - stroke) / 2
  const circumference = Math.PI * radius
  const clamped = value !== null ? Math.max(0, Math.min(100, value)) : 0
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + stroke / 2} viewBox={`0 0 ${size} ${size / 2 + stroke / 2}`}>
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-neutral-100 dark:stroke-neutral-800"
        />
        {value !== null && (
          <path
            d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`transition-[stroke-dashoffset] duration-1000 ease-out ${colorFor(clamped, inverted)}`}
          />
        )}
      </svg>
      <div className="-mt-8 flex flex-col items-center">
        <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
          {value !== null ? `${Math.round(value)}%` : '—'}
        </span>
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
        {sublabel && <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{sublabel}</span>}
      </div>
    </div>
  )
}

export default Gauge
