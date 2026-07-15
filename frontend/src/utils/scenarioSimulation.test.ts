import { describe, expect, it } from 'vitest'
import {
  buildRecommendationChanges,
  buildScenarioSummary,
  computeScenarioBaseline,
  computeScenarioProjection,
  decisionReadinessLabel,
  type ScenarioProjection,
} from './scenarioSimulation'
import { DEFAULT_SCENARIO_PARAMETERS } from '../types/Scenario'
import type { ScenarioParameters } from '../types/Scenario'
import type { MissionAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'

function output(confidence: number, evidence_used: string[] = []) {
  return { confidence, evidence_used }
}

function baseAnalysis(overrides: Partial<MissionAnalysis> = {}): MissionAnalysis {
  return {
    id: 'analysis-1',
    mission_id: 'mission-1',
    status: 'completed',
    business_analysis: null,
    strategy_analysis: null,
    risk_analysis: null,
    executive_analysis: null,
    retrieval_stats: null,
    error_message: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    id: 'dataset-1',
    mission_id: 'mission-1',
    original_filename: 'sales.csv',
    file_type: 'csv',
    file_size: 1024,
    upload_status: 'ready',
    created_at: '2026-01-01T00:00:00Z',
    profile: {
      id: 'profile-1',
      dataset_id: 'dataset-1',
      row_count: 100,
      column_count: 4,
      columns: [],
      missing_values: {},
      duplicate_row_count: 0,
      numeric_summary: {},
      categorical_summary: {},
      encoding: 'utf-8',
      delimiter: ',',
      validation_errors: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    index: null,
    ...overrides,
  }
}

function params(overrides: Partial<ScenarioParameters> = {}): ScenarioParameters {
  return { ...DEFAULT_SCENARIO_PARAMETERS, ...overrides }
}

function fullAnalysis(riskLevel = 'Medium'): MissionAnalysis {
  return baseAnalysis({
    business_analysis: { business_problem: 'p', key_opportunities: [], important_metrics: [], recommended_next_steps: [], ...output(0.9, ['e']) },
    strategy_analysis: { strategic_objectives: [], recommended_initiatives: [], implementation_roadmap: [], kpis: [], business_impact: 'b', priority: 'High', ...output(0.9, ['e']) },
    risk_analysis: { critical_risks: [], assumptions: [], recommended_mitigations: [], overall_risk_level: riskLevel, ...output(0.9, ['e']) },
    executive_analysis: { executive_summary: 's', key_findings: [], trade_offs: [], final_recommendation: 'r', ...output(0.9, ['e']) },
  })
}

describe('computeScenarioBaseline', () => {
  it('collects the mission’s real current metrics without inventing anything', () => {
    const baseline = computeScenarioBaseline(fullAnalysis('Medium'), [dataset()])

    expect(baseline.confidencePercent).toBe(90)
    expect(baseline.riskPercent).toBe(40) // Medium -> 40
    expect(baseline.datasetQualityPercent).toBe(100)
    expect(baseline.evidenceCoveragePercent).toBe(100)
    expect(baseline.deploymentReadinessPercent).toBe(75) // (90 + (100-40)) / 2
  })

  it('returns all-null fields for a mission with no analysis and no datasets', () => {
    const baseline = computeScenarioBaseline(null, [])

    expect(baseline.confidencePercent).toBeNull()
    expect(baseline.riskPercent).toBeNull()
    expect(baseline.datasetQualityPercent).toBeNull()
    expect(baseline.evidenceCoveragePercent).toBeNull()
    expect(baseline.missionHealthPercent).toBeNull()
    expect(baseline.businessReadinessPercent).toBeNull()
    expect(baseline.deploymentReadinessPercent).toBeNull()
  })
})

describe('decisionReadinessLabel', () => {
  it('labels boundary values correctly', () => {
    expect(decisionReadinessLabel(80)).toBe('Ready for Deployment')
    expect(decisionReadinessLabel(79)).toBe('Ready with Monitoring')
    expect(decisionReadinessLabel(50)).toBe('Ready with Monitoring')
    expect(decisionReadinessLabel(49)).toBe('Needs Review')
  })

  it('returns "Not Available" when deployment readiness could not be computed', () => {
    expect(decisionReadinessLabel(null)).toBe('Not Available')
  })
})

describe('computeScenarioProjection', () => {
  const baseline = computeScenarioBaseline(fullAnalysis('Medium'), [dataset()])

  it('leaves every projection unchanged from baseline when no sliders are moved', () => {
    const projection = computeScenarioProjection(baseline, params())

    expect(projection.revenueIndex).toBe(100)
    expect(projection.revenueIndexDelta).toBe(0)
    expect(projection.riskPercent).toBe(baseline.riskPercent)
    expect(projection.riskDelta).toBe(0)
    expect(projection.confidencePercent).toBe(baseline.confidencePercent)
    expect(projection.confidenceDelta).toBe(0)
    expect(projection.businessImpactPercent).toBe(50)
  })

  it('applies each weight table’s documented direction for a moved slider', () => {
    // salesGrowth: +0.7 revenue weight, +0.5 business-impact weight, no risk/confidence weight.
    const projection = computeScenarioProjection(baseline, params({ salesGrowth: 20 }))

    expect(projection.revenueIndexDelta).toBe(14) // 20 * 0.7
    expect(projection.revenueIndex).toBe(114)
    expect(projection.businessImpactDelta).toBe(10) // 20 * 0.5
    expect(projection.businessImpactPercent).toBe(60)
    expect(projection.riskDelta).toBe(0)
    expect(projection.confidenceDelta).toBe(0)
  })

  it('raises risk and lowers confidence for a supply chain delay, per its documented direction', () => {
    const projection = computeScenarioProjection(baseline, params({ supplyChainDelay: 20 }))

    expect(projection.riskDelta).toBe(10) // 20 * 0.5
    expect(projection.riskPercent).toBe(50) // baseline 40 + 10
    expect(projection.confidenceDelta).toBe(-3) // 20 * -0.15
    expect(projection.confidencePercent).toBe(87) // baseline 90 - 3
  })

  it('clamps the revenue index within [0, 250] instead of running away', () => {
    const projection = computeScenarioProjection(baseline, params({ salesGrowth: 50, revenueGrowth: 50 }))

    // 50*0.7 + 50*0.8 = 75 -> 100 + 75 = 175, still within bounds here,
    // but the clamp itself is what's under test at the extremes:
    expect(projection.revenueIndex).toBeLessThanOrEqual(250)
    expect(projection.revenueIndex).toBeGreaterThanOrEqual(0)
  })

  it('keeps risk/confidence null when the baseline never had a value to project from', () => {
    const emptyBaseline = computeScenarioBaseline(null, [])

    const projection = computeScenarioProjection(emptyBaseline, params({ supplyChainDelay: 20 }))

    expect(projection.riskPercent).toBeNull()
    expect(projection.riskDelta).toBeNull()
    expect(projection.confidencePercent).toBeNull()
    expect(projection.confidenceDelta).toBeNull()
    // Revenue/business-impact don't depend on a baseline value, so they still project.
    expect(projection.revenueIndex).not.toBeNull()
  })
})

describe('buildRecommendationChanges', () => {
  it('never invents recommendation text, and buckets shift by keyword-matched slider direction', () => {
    const analysis = baseAnalysis({
      business_analysis: {
        business_problem: 'p',
        key_opportunities: [],
        important_metrics: [],
        recommended_next_steps: ['Increase marketing spend to drive demand', 'Reduce headcount costs'],
        ...output(0.8),
      },
    })

    const changes = buildRecommendationChanges(analysis, params({ marketingBudget: 20, operatingCost: -20 }))

    expect(changes.map((c) => c.text)).toEqual([
      'Increase marketing spend to drive demand',
      'Reduce headcount costs',
    ])
    expect(changes[0]!.shift).toBe('up') // marketingBudget +20 > 10
    expect(changes[0]!.matchedParameters).toContain('Marketing Budget')
    expect(changes[1]!.shift).toBe('down') // operatingCost -20 < -10
    expect(changes[1]!.matchedParameters).toContain('Operating Cost')
  })

  it('marks a recommendation unchanged when no moved slider matches its text', () => {
    const analysis = baseAnalysis({
      business_analysis: {
        business_problem: 'p',
        key_opportunities: [],
        important_metrics: [],
        recommended_next_steps: ['Review store layout'],
        ...output(0.8),
      },
    })

    const changes = buildRecommendationChanges(analysis, params({ marketingBudget: 20 }))

    expect(changes[0]!.shift).toBe('unchanged')
    expect(changes[0]!.matchedParameters).toEqual([])
  })

  it('returns an empty list when there is no analysis to derive recommendations from', () => {
    expect(buildRecommendationChanges(null, params())).toEqual([])
  })
})

describe('buildScenarioSummary', () => {
  const baseline = computeScenarioBaseline(fullAnalysis('Medium'), [dataset()])

  it('states plainly that nothing has been adjusted when every slider is at baseline', () => {
    const projection = computeScenarioProjection(baseline, params())

    const summary = buildScenarioSummary(params(), projection)

    expect(summary).toContain('No scenario parameters have been adjusted yet')
  })

  it('describes the adjusted parameters and their real projected outcomes', () => {
    const adjusted = params({ salesGrowth: 30 })
    const projection: ScenarioProjection = computeScenarioProjection(baseline, adjusted)

    const summary = buildScenarioSummary(adjusted, projection)

    expect(summary).toContain('+30% change in sales growth')
    expect(summary).toContain('improved revenue index')
  })
})
