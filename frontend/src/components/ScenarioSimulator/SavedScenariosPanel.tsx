import { Copy, FolderOpen, PenLine, Save, Trash2 } from 'lucide-react'
import Card from '../Card'
import Button from '../Button'
import Badge from '../Badge'
import EmptyState from '../EmptyState'
import { formatDateTime } from '../../utils/date'
import type { SavedScenario, ScenarioParameters } from '../../types/Scenario'

interface SavedScenariosPanelProps {
  scenarios: SavedScenario[]
  currentParameters: ScenarioParameters
  onCreate: (name: string, parameters: ScenarioParameters) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onLoad: (parameters: ScenarioParameters) => void
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

/** Scenarios persist entirely in the browser's `localStorage` (see
 * `useSavedScenarios`) — never sent to the backend. Naming uses a native
 * prompt, consistent with the `window.confirm` pattern already used
 * elsewhere in the app (e.g. dataset/mission deletion) for lightweight
 * interactions that don't warrant a full modal. */
function SavedScenariosPanel({
  scenarios,
  currentParameters,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  onLoad,
  selectedIds,
  onToggleSelect,
}: SavedScenariosPanelProps) {
  function handleCreate() {
    const name = window.prompt('Name this scenario:', `Scenario ${scenarios.length + 1}`)
    if (name && name.trim()) onCreate(name.trim(), currentParameters)
  }

  function handleRename(scenario: SavedScenario) {
    const name = window.prompt('Rename scenario:', scenario.name)
    if (name && name.trim() && name.trim() !== scenario.name) onRename(scenario.id, name.trim())
  }

  function handleDelete(scenario: SavedScenario) {
    if (window.confirm(`Delete scenario "${scenario.name}"? This cannot be undone.`)) onDelete(scenario.id)
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Saved Scenarios</h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Stored locally in this browser. Select two or more to compare.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleCreate}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Save Current
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No saved scenarios yet" description="Adjust the controls above, then save the current scenario to compare it later." />
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(scenario.id)}
                  onChange={() => onToggleSelect(scenario.id)}
                  className="h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-700"
                  aria-label={`Select ${scenario.name} for comparison`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{scenario.name}</span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">Updated {formatDateTime(scenario.updatedAt)}</span>
                </span>
                {selectedIds.includes(scenario.id) && <Badge variant="primary">Comparing</Badge>}
              </label>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onLoad(scenario.parameters)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  aria-label={`Load ${scenario.name}`}
                  title="Load into controls"
                >
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRename(scenario)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  aria-label={`Rename ${scenario.name}`}
                  title="Rename"
                >
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(scenario.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  aria-label={`Duplicate ${scenario.name}`}
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(scenario)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-danger-50 hover:text-danger-600 dark:text-neutral-400 dark:hover:bg-danger-950/40 dark:hover:text-danger-400"
                  aria-label={`Delete ${scenario.name}`}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default SavedScenariosPanel
