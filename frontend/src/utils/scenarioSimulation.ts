import type { MissionAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'
import type { ScenarioParameterKey, ScenarioParameters } from '../types/Scenario'
import { PARAMETER_DEFINITIONS } from '../types/Scenario'
import { buildConsensusMetrics } from './collaborationCenter'
import { buildBusinessReadiness, riskLevelToPercent } from './analyticsCharts'

// ---------------------------------------------------------------------------
// Everything below is a transparent, deterministic linear model — the same
// inputs always produce the same outputs, and no network/AI call is ever
// made. It is NOT a forecast: it's a what-if sandbox that nudges the
// mission's real, already-computed baseline metrics (confidence, risk,
// dataset quality, evidence coverage) by a documented, fixed amount per
// slider. The weight tables below are the entire model — nothing is
// hidden, and nothing is invented beyond what's declared here.
// ---------------------------------------------------------------------------

export interface ScenarioBaseline {
  confidencePercent: number | null
  riskPercent: number | null
  datasetQualityPercent: number | null
  evidenceCoveragePercent: number | null
  missionHealthPercent: number | null
  businessReadinessPercent: number | null
  deploymentReadinessPercent: number | null
}

function deploymentReadinessFromPercents(confidencePercent: number | null, riskPercent: number | null): number | null {
  if (confidencePercent === null || riskPercent === null) return null
  return Math.round((confidencePercent + (100 - riskPercent)) / 2)
}

/** Every field here is read from data the app already fetches and already
 * derives elsewhere (`buildConsensusMetrics`, `buildBusinessReadiness`) —
 * this function invents nothing, it just collects the mission's real
 * current state into one anchor point the simulation nudges away from. */
export function computeScenarioBaseline(analysis: MissionAnalysis | null, datasets: Dataset[]): ScenarioBaseline {
  const metrics = buildConsensusMetrics(analysis, datasets)
  const riskPercent = riskLevelToPercent(analysis?.risk_analysis?.overall_risk_level ?? null)
  const businessReadinessPercent = buildBusinessReadiness(analysis, datasets)
  const missionHealthInputs = [metrics.overallConfidence, metrics.datasetQuality?.scorePercent ?? null, metrics.evidenceCoveragePercent].filter(
    (v): v is number => v !== null
  )
  const missionHealthPercent =
    missionHealthInputs.length > 0 ? Math.round(missionHealthInputs.reduce((sum, v) => sum + v, 0) / missionHealthInputs.length) : null

  return {
    confidencePercent: metrics.overallConfidence,
    riskPercent,
    datasetQualityPercent: metrics.datasetQuality?.scorePercent ?? null,
    evidenceCoveragePercent: metrics.evidenceCoveragePercent,
    missionHealthPercent,
    businessReadinessPercent,
    deploymentReadinessPercent: deploymentReadinessFromPercents(metrics.overallConfidence, riskPercent),
  }
}

type WeightTable = Partial<Record<ScenarioParameterKey, number>>

const REVENUE_WEIGHTS: WeightTable = {
  salesGrowth: 0.7,
  revenueGrowth: 0.8,
  marketingBudget: 0.3,
  customerDemand: 0.4,
  operatingCost: -0.25,
  fuelPrice: -0.1,
  supplyChainDelay: -0.2,
  economicIndex: 0.3,
  inflation: -0.3,
  discountRate: -0.15,
}

const RISK_WEIGHTS: WeightTable = {
  supplyChainDelay: 0.5,
  fuelPrice: 0.2,
  temperature: 0.1,
  inflation: 0.25,
  inventoryLevel: -0.15,
  inventorySafetyStock: -0.3,
  riskTolerance: -0.4,
  economicIndex: -0.2,
  discountRate: 0.1,
}

const CONFIDENCE_WEIGHTS: WeightTable = {
  supplyChainDelay: -0.15,
  inflation: -0.1,
  fuelPrice: -0.05,
  customerDemand: 0.1,
  economicIndex: 0.15,
  marketingBudget: 0.05,
}

const BUSINESS_IMPACT_WEIGHTS: WeightTable = {
  salesGrowth: 0.5,
  revenueGrowth: 0.5,
  marketingBudget: 0.3,
  customerDemand: 0.3,
  operatingCost: -0.3,
  inventorySafetyStock: -0.1,
  discountRate: -0.15,
  economicIndex: 0.2,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function weightedDelta(params: ScenarioParameters, weights: WeightTable): number {
  return (Object.entries(weights) as [ScenarioParameterKey, number][]).reduce(
    (sum, [key, weight]) => sum + params[key] * weight,
    0
  )
}

export interface ScenarioProjection {
  revenueIndex: number
  revenueIndexDelta: number
  riskPercent: number | null
  riskDelta: number | null
  confidencePercent: number | null
  confidenceDelta: number | null
  businessImpactPercent: number
  businessImpactDelta: number
  missionHealthPercent: number | null
  missionHealthDelta: number | null
  /** Deliberately unchanged from baseline — dataset quality and evidence
   * coverage (what this metric is built from) aren't affected by market
   * assumptions like fuel price or marketing budget. Showing it as
   * "unchanged" is more honest than forcing every metric to move. */
  businessReadinessPercent: number | null
  deploymentReadinessPercent: number | null
  deploymentReadinessDelta: number | null
  decisionReadinessLabel: string
}

export function decisionReadinessLabel(deploymentReadinessPercent: number | null): string {
  if (deploymentReadinessPercent === null) return 'Not Available'
  if (deploymentReadinessPercent >= 80) return 'Ready for Deployment'
  if (deploymentReadinessPercent >= 50) return 'Ready with Monitoring'
  return 'Needs Review'
}

export function computeScenarioProjection(baseline: ScenarioBaseline, params: ScenarioParameters): ScenarioProjection {
  const revenueIndexDelta = Math.round(weightedDelta(params, REVENUE_WEIGHTS))
  const revenueIndex = Math.round(clamp(100 + revenueIndexDelta, 0, 250))

  const riskDelta = baseline.riskPercent !== null ? Math.round(weightedDelta(params, RISK_WEIGHTS)) : null
  const riskPercent = baseline.riskPercent !== null && riskDelta !== null ? Math.round(clamp(baseline.riskPercent + riskDelta, 0, 100)) : null

  const confidenceDelta = baseline.confidencePercent !== null ? Math.round(weightedDelta(params, CONFIDENCE_WEIGHTS)) : null
  const confidencePercent =
    baseline.confidencePercent !== null && confidenceDelta !== null
      ? Math.round(clamp(baseline.confidencePercent + confidenceDelta, 0, 100))
      : null

  const businessImpactDelta = Math.round(weightedDelta(params, BUSINESS_IMPACT_WEIGHTS))
  const businessImpactPercent = Math.round(clamp(50 + businessImpactDelta, 0, 100))

  const missionHealthInputs = [confidencePercent, baseline.datasetQualityPercent, baseline.evidenceCoveragePercent].filter(
    (v): v is number => v !== null
  )
  const missionHealthPercent =
    missionHealthInputs.length > 0 ? Math.round(missionHealthInputs.reduce((sum, v) => sum + v, 0) / missionHealthInputs.length) : null
  const missionHealthDelta =
    missionHealthPercent !== null && baseline.missionHealthPercent !== null ? missionHealthPercent - baseline.missionHealthPercent : null

  const deploymentReadinessPercent = deploymentReadinessFromPercents(confidencePercent, riskPercent)
  const deploymentReadinessDelta =
    deploymentReadinessPercent !== null && baseline.deploymentReadinessPercent !== null
      ? deploymentReadinessPercent - baseline.deploymentReadinessPercent
      : null

  return {
    revenueIndex,
    revenueIndexDelta,
    riskPercent,
    riskDelta,
    confidencePercent,
    confidenceDelta,
    businessImpactPercent,
    businessImpactDelta,
    missionHealthPercent,
    missionHealthDelta,
    businessReadinessPercent: baseline.businessReadinessPercent,
    deploymentReadinessPercent,
    deploymentReadinessDelta,
    decisionReadinessLabel: decisionReadinessLabel(deploymentReadinessPercent),
  }
}

// ---------------------------------------------------------------------------
// Recommendation Changes
// ---------------------------------------------------------------------------

const RECOMMENDATION_KEYWORDS: Partial<Record<ScenarioParameterKey, string[]>> = {
  inventoryLevel: ['inventory', 'stock', 'stockout'],
  inventorySafetyStock: ['safety stock', 'inventory', 'stock'],
  fuelPrice: ['fuel'],
  temperature: ['temperature', 'weather', 'holiday', 'seasonal', 'climate'],
  marketingBudget: ['marketing', 'promo', 'markdown', 'advertising', 'campaign'],
  supplyChainDelay: ['supply chain', 'delay', 'lead time', 'logistics', 'shipping', 'supplier'],
  customerDemand: ['demand', 'customer', 'traffic', 'uplift'],
  operatingCost: ['cost', 'expense', 'budget', 'staffing', 'labor'],
  discountRate: ['discount', 'markdown', 'price', 'pricing'],
  economicIndex: ['economic', 'macro'],
  inflation: ['inflation', 'price'],
  riskTolerance: ['risk'],
  salesGrowth: ['sales'],
  revenueGrowth: ['revenue', 'roi'],
}

export type RecommendationAgent = 'Business' | 'Strategy' | 'Risk' | 'Executive'

export interface RecommendationChange {
  id: string
  text: string
  agentName: RecommendationAgent
  shift: 'up' | 'down' | 'unchanged'
  matchedParameters: string[]
}

/** Never invents new recommendation text — every item here is a real
 * string already produced by an agent. What's derived is only the
 * "shift": a keyword match against whichever sliders moved, signed by
 * that slider's direction, bucketed into up/down/unchanged with a fixed
 * dead zone so tiny moves don't reorder anything. */
export function buildRecommendationChanges(analysis: MissionAnalysis | null, params: ScenarioParameters): RecommendationChange[] {
  if (!analysis) return []
  const definitionByKey = new Map(PARAMETER_DEFINITIONS.map((def) => [def.key, def]))

  const items: { text: string; agentName: RecommendationAgent }[] = []
  analysis.business_analysis?.recommended_next_steps.forEach((text) => items.push({ text, agentName: 'Business' }))
  analysis.strategy_analysis?.recommended_initiatives.forEach((text) => items.push({ text, agentName: 'Strategy' }))
  analysis.risk_analysis?.recommended_mitigations.forEach((text) => items.push({ text, agentName: 'Risk' }))
  if (analysis.executive_analysis?.final_recommendation) {
    items.push({ text: analysis.executive_analysis.final_recommendation, agentName: 'Executive' })
  }

  return items.map(({ text, agentName }, index) => {
    let signedRelevance = 0
    const matched = new Set<string>()
    const lower = text.toLowerCase()

    for (const [key, keywords] of Object.entries(RECOMMENDATION_KEYWORDS) as [ScenarioParameterKey, string[]][]) {
      const delta = params[key]
      if (!delta) continue
      if (keywords.some((keyword) => lower.includes(keyword))) {
        signedRelevance += delta
        const def = definitionByKey.get(key)
        if (def) matched.add(def.label)
      }
    }

    const shift: RecommendationChange['shift'] = signedRelevance > 10 ? 'up' : signedRelevance < -10 ? 'down' : 'unchanged'

    return { id: `${agentName}-${index}`, text, agentName, shift, matchedParameters: [...matched] }
  })
}

// ---------------------------------------------------------------------------
// Scenario Summary
// ---------------------------------------------------------------------------

const SCENARIO_DISCLAIMER =
  'These projections are derived from the current analysis and should be treated as exploratory scenarios rather than new AI analysis.'

/** A fixed template filled in from real deltas — no text generation, no
 * AI call. Given the same parameters and baseline, this always returns
 * the exact same sentence. */
export function buildScenarioSummary(params: ScenarioParameters, projection: ScenarioProjection): string {
  const adjusted = PARAMETER_DEFINITIONS.filter((def) => params[def.key] !== 0)

  if (adjusted.length === 0) {
    return `No scenario parameters have been adjusted yet — all projections currently match the mission's baseline analysis. ${SCENARIO_DISCLAIMER}`
  }

  const changeList = adjusted
    .map((def) => `a ${params[def.key] > 0 ? '+' : ''}${params[def.key]}% change in ${def.label.toLowerCase()}`)
    .join(', ')

  const outcomes: string[] = []
  if (projection.revenueIndexDelta > 5) outcomes.push('an improved revenue index')
  else if (projection.revenueIndexDelta < -5) outcomes.push('a reduced revenue index')

  if (projection.riskDelta !== null) {
    if (projection.riskDelta > 5) outcomes.push('increased risk')
    else if (projection.riskDelta < -5) outcomes.push('reduced risk')
  }

  if (projection.businessImpactDelta > 5) outcomes.push('improved business impact')
  else if (projection.businessImpactDelta < -5) outcomes.push('reduced business impact')

  if (projection.deploymentReadinessDelta !== null) {
    if (projection.deploymentReadinessDelta > 5) outcomes.push('improved deployment readiness')
    else if (projection.deploymentReadinessDelta < -5) outcomes.push('reduced deployment readiness')
  }

  const outcomeText = outcomes.length > 0 ? outcomes.join(' alongside ') : 'no material change from the current baseline'

  return `Based on ${changeList}, MissionOS projects ${outcomeText}. ${SCENARIO_DISCLAIMER}`
}
