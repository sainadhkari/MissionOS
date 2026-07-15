import { describe, expect, it } from 'vitest'
import {
  averageConfidence,
  capitalize,
  computeDatasetQuality,
  confidenceBadgeVariant,
  confidenceLabel,
  topRecommendations,
  topRisks,
} from './executiveDashboard'
import type { MissionAnalysis, RiskItem, StrategyAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'

function output(confidence: number) {
  return { confidence, evidence_used: [] }
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

describe('capitalize', () => {
  it('uppercases the first letter and leaves the rest unchanged', () => {
    expect(capitalize('moderate')).toBe('Moderate')
  })

  it('returns an empty string unchanged rather than throwing', () => {
    expect(capitalize('')).toBe('')
  })
})

describe('averageConfidence', () => {
  it('averages the confidence of every present stage', () => {
    const analysis = baseAnalysis({
      business_analysis: { business_problem: 'p', key_opportunities: [], important_metrics: [], recommended_next_steps: [], ...output(0.8) },
      strategy_analysis: { strategic_objectives: [], recommended_initiatives: [], implementation_roadmap: [], kpis: [], business_impact: 'b', priority: 'High', ...output(0.6) },
    })

    expect(averageConfidence(analysis)).toBeCloseTo(0.7)
  })

  it('returns null when no stage has a confidence value yet (analysis not started)', () => {
    expect(averageConfidence(baseAnalysis())).toBeNull()
  })
})

describe('confidenceLabel / confidenceBadgeVariant', () => {
  it('labels boundary values correctly', () => {
    expect(confidenceLabel(0.8)).toBe('High')
    expect(confidenceLabel(0.79)).toBe('Moderate')
    expect(confidenceLabel(0.5)).toBe('Moderate')
    expect(confidenceLabel(0.49)).toBe('Low')
  })

  it('maps the same boundaries to badge variants', () => {
    expect(confidenceBadgeVariant(0.8)).toBe('success')
    expect(confidenceBadgeVariant(0.5)).toBe('warning')
    expect(confidenceBadgeVariant(0.49)).toBe('danger')
  })
})

describe('computeDatasetQuality', () => {
  it('scores completeness penalized by duplicate rate across every ready+profiled dataset', () => {
    const datasets = [
      dataset({
        id: 'a',
        profile: {
          ...dataset().profile!,
          row_count: 100,
          column_count: 2,
          missing_values: { col_a: 10 },
          duplicate_row_count: 10,
        },
      }),
    ]

    const quality = computeDatasetQuality(datasets)

    // total cells = 200, missing = 10 -> completeness = 0.95
    // duplicate rate = 10/100 = 0.1 -> penalty 0.05
    // score = 0.95 - 0.05 = 0.90 -> 90%
    expect(quality?.scorePercent).toBe(90)
    expect(quality?.label).toBe('Excellent')
    expect(quality?.readyCount).toBe(1)
    expect(quality?.totalCount).toBe(1)
  })

  it('returns null when no dataset has finished validating yet (pre-migration/empty state)', () => {
    expect(computeDatasetQuality([])).toBeNull()
    expect(computeDatasetQuality([dataset({ upload_status: 'validating', profile: null })])).toBeNull()
  })
})

describe('topRisks', () => {
  function risk(severity: string): RiskItem {
    return { title: severity, category: 'Business', severity, probability: 'Medium', impact: 'i', mitigation: 'm' }
  }

  it('sorts by severity, most severe first, regardless of input order', () => {
    const risks = [risk('Low'), risk('Critical'), risk('Medium'), risk('High')]

    const sorted = topRisks(risks)

    expect(sorted.map((r) => r.severity)).toEqual(['Critical', 'High', 'Medium', 'Low'])
  })

  it('limits to the requested count', () => {
    const risks = [risk('Low'), risk('Critical'), risk('Medium'), risk('High')]

    expect(topRisks(risks, 2).map((r) => r.severity)).toEqual(['Critical', 'High'])
  })

  it('returns an empty list for a risk analysis with no critical risks', () => {
    expect(topRisks([])).toEqual([])
  })
})

describe('topRecommendations', () => {
  function strategy(initiatives: string[]): StrategyAnalysis {
    return {
      strategic_objectives: [],
      recommended_initiatives: initiatives,
      implementation_roadmap: [],
      kpis: [],
      business_impact: 'b',
      priority: 'High',
      ...output(0.7),
    }
  }

  it('takes the first `limit` initiatives', () => {
    expect(topRecommendations(strategy(['a', 'b', 'c', 'd', 'e', 'f']), 3)).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty list when the strategy has no initiatives', () => {
    expect(topRecommendations(strategy([]))).toEqual([])
  })
})
