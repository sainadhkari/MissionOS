import { Minus, Plus, RotateCcw } from 'lucide-react'
import type { ParameterDefinition } from '../../types/Scenario'

interface ParameterControlProps {
  definition: ParameterDefinition
  value: number
  onChange: (value: number) => void
}

function clampToStep(value: number, definition: ParameterDefinition): number {
  const clamped = Math.max(definition.min, Math.min(definition.max, value))
  return Math.round(clamped / definition.step) * definition.step
}

/** Every scenario parameter is controlled through four synchronized
 * inputs — slider, stepper, number box, and a per-control reset — so
 * whichever interaction a user prefers (drag, click, type) stays in sync
 * with the others. */
function ParameterControl({ definition, value, onChange }: ParameterControlProps) {
  const isAdjusted = value !== 0
  const percentOfRange = ((value - definition.min) / (definition.max - definition.min)) * 100

  return (
    <div className="rounded-lg border border-neutral-200 p-3.5 dark:border-neutral-800">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{definition.label}</p>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">{definition.description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(0)}
          disabled={!isAdjusted}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          aria-label={`Reset ${definition.label}`}
          title="Reset to baseline"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clampToStep(value - definition.step, definition))}
          disabled={value <= definition.min}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label={`Decrease ${definition.label}`}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <input
          type="range"
          min={definition.min}
          max={definition.max}
          step={definition.step}
          value={value}
          onChange={(event) => onChange(clampToStep(Number(event.target.value), definition))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-primary-600 dark:bg-neutral-700"
          style={{
            background: `linear-gradient(to right, ${isAdjusted ? '#6366f1' : '#94a3b8'} ${percentOfRange}%, transparent ${percentOfRange}%)`,
          }}
          aria-label={definition.label}
        />

        <button
          type="button"
          onClick={() => onChange(clampToStep(value + definition.step, definition))}
          disabled={value >= definition.max}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          aria-label={`Increase ${definition.label}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <div className="flex w-20 shrink-0 items-center rounded-md border border-neutral-300 dark:border-neutral-700">
          <input
            type="number"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={value}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              if (!Number.isNaN(parsed)) onChange(clampToStep(parsed, definition))
            }}
            className="h-7 w-full min-w-0 rounded-l-md bg-transparent px-2 text-right text-xs font-medium text-neutral-900 focus:outline-none dark:text-neutral-100"
            aria-label={`${definition.label} value`}
          />
          <span className="pr-2 text-xs text-neutral-400 dark:text-neutral-500">{definition.unit}</span>
        </div>
      </div>
    </div>
  )
}

export default ParameterControl
