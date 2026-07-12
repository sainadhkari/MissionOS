import { FlaskConical } from 'lucide-react'
import Badge from '../Badge'

/** The one badge every projected number in the Scenario Simulator must
 * carry — a constant, explicit reminder that these values are a
 * derived what-if simulation, never a new AI prediction. */
function ScenarioProjectionBadge() {
  return (
    <Badge variant="info" className="gap-1">
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Scenario Projection
    </Badge>
  )
}

export default ScenarioProjectionBadge
