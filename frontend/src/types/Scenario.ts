export type ScenarioParameterKey =
  | 'salesGrowth'
  | 'revenueGrowth'
  | 'marketingBudget'
  | 'inventoryLevel'
  | 'operatingCost'
  | 'fuelPrice'
  | 'temperature'
  | 'customerDemand'
  | 'riskTolerance'
  | 'inventorySafetyStock'
  | 'supplyChainDelay'
  | 'economicIndex'
  | 'inflation'
  | 'discountRate'

export type ScenarioParameters = Record<ScenarioParameterKey, number>

export interface ParameterDefinition {
  key: ScenarioParameterKey
  label: string
  /** One sentence naming exactly which projected metrics this slider is
   * assumed to move, and in which direction — since the simulation is a
   * transparent linear model, not AI, the assumption should be legible to
   * whoever is dragging the slider. */
  description: string
  min: number
  max: number
  step: number
  unit: string
}

/** Every control is a percentage delta from the current baseline (0 = no
 * change) rather than an absolute value — the backend doesn't persist a
 * literal "current sales growth rate" or "current fuel price" for a
 * mission, only the AI agents' analysis of whatever data was uploaded. A
 * relative delta is the only honest framing that doesn't invent a starting
 * value the app doesn't have. */
export const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  { key: 'salesGrowth', label: 'Sales Growth', description: 'Assumed change in unit sales volume. Raises the revenue projection.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'revenueGrowth', label: 'Revenue Growth', description: 'Assumed change in top-line revenue. Raises the revenue projection.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'marketingBudget', label: 'Marketing Budget', description: 'Assumed change in marketing spend. Modestly raises revenue and confidence.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'inventoryLevel', label: 'Inventory Level', description: 'Assumed change in stock on hand. Higher levels modestly reduce risk.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'operatingCost', label: 'Operating Cost', description: 'Assumed change in operating expenses. Higher cost lowers the revenue and business-impact projections.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'fuelPrice', label: 'Fuel Price', description: 'Assumed change in fuel cost. Higher prices raise risk and slightly lower confidence.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'temperature', label: 'Temperature', description: 'Assumed deviation from typical seasonal temperature. Extremes modestly raise risk.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'customerDemand', label: 'Customer Demand', description: 'Assumed change in customer demand. Raises revenue, business impact, and confidence.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'riskTolerance', label: 'Risk Tolerance', description: "Assumed change in the organization's willingness to accept risk. Higher tolerance lowers the risk projection.", min: -50, max: 50, step: 5, unit: '%' },
  { key: 'inventorySafetyStock', label: 'Inventory Safety Stock', description: 'Assumed change in safety-stock buffer. Higher buffers reduce risk but tie up capital, slightly lowering business impact.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'supplyChainDelay', label: 'Supply Chain Delay', description: 'Assumed change in supplier lead time. Longer delays strongly raise risk and lower confidence and revenue.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'economicIndex', label: 'Economic Index', description: 'Assumed change in overall economic conditions. Improving conditions raise revenue and confidence, and lower risk.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'inflation', label: 'Inflation', description: 'Assumed change in inflation. Higher inflation lowers the real revenue projection and raises risk.', min: -50, max: 50, step: 5, unit: '%' },
  { key: 'discountRate', label: 'Discount Rate', description: 'Assumed change in promotional discounting. Deeper discounts lower margin (business impact) and slightly raise risk.', min: -50, max: 50, step: 5, unit: '%' },
]

export const DEFAULT_SCENARIO_PARAMETERS: ScenarioParameters = PARAMETER_DEFINITIONS.reduce((acc, def) => {
  acc[def.key] = 0
  return acc
}, {} as ScenarioParameters)

export interface SavedScenario {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  parameters: ScenarioParameters
}
