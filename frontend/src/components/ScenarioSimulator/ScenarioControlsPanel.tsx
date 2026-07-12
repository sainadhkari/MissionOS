import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import Card from '../Card'
import Button from '../Button'
import ParameterControl from './ParameterControl'
import { PARAMETER_DEFINITIONS, DEFAULT_SCENARIO_PARAMETERS } from '../../types/Scenario'
import type { ScenarioParameterKey, ScenarioParameters } from '../../types/Scenario'

interface ScenarioControlsPanelProps {
  parameters: ScenarioParameters
  onChange: (key: ScenarioParameterKey, value: number) => void
  onResetAll: () => void
}

function ScenarioControlsPanel({ parameters, onChange, onResetAll }: ScenarioControlsPanelProps) {
  const adjustedCount = PARAMETER_DEFINITIONS.filter((def) => parameters[def.key] !== DEFAULT_SCENARIO_PARAMETERS[def.key]).length

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <SlidersHorizontal className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            Scenario Controls
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {adjustedCount > 0 ? `${adjustedCount} of ${PARAMETER_DEFINITIONS.length} assumptions adjusted` : 'All assumptions at baseline'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onResetAll} disabled={adjustedCount === 0}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset All
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {PARAMETER_DEFINITIONS.map((definition) => (
          <ParameterControl
            key={definition.key}
            definition={definition}
            value={parameters[definition.key]}
            onChange={(value) => onChange(definition.key, value)}
          />
        ))}
      </div>
    </Card>
  )
}

export default ScenarioControlsPanel
