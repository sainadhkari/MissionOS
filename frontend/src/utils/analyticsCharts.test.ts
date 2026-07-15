import { describe, expect, it } from 'vitest'
import {
  buildBusinessImpactWaterfallSteps,
  buildBusinessReadiness,
  buildCompletenessSeries,
  buildDatasetQualityRadar,
  buildDatasetSizeSeries,
  buildDuplicateDistribution,
  buildEvidenceSourceMentions,
  buildMissingValuesSeries,
  buildMissionHealthScore,
  buildRecommendationCategories,
  buildRiskSeverityDistribution,
  buildRowsVsColumnsSeries,
  deploymentReadinessPercent,
  riskLevelToPercent,
} from './analyticsCharts'
import type { MissionAnalysis, RiskAnalysis } from '../types/Analysis'
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
    file_size: 2048,
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

function risk(overrides: Partial<RiskAnalysis> = {}): RiskAnalysis {
  return {
    critical_risks: [],
    assumptions: [],
    recommended_mitigations: [],
    overall_risk_level: 'Medium',
    ...output(0.7),
    ...overrides,
  }
}

describe('buildRiskSeverityDistribution', () => {
  it('buckets free-form severity text into the standard vocabulary', () => {
    const analysis = risk({
      critical_risks: [
        { title: 't', category: 'c', severity: 'Critical', probability: 'High', impact: 'i', mitigation: 'm' },
        { title: 't', category: 'c', severity: 'high', probability: 'High', impact: 'i', mitigation: 'm' },
        { title: 't', category: 'c', severity: 'Moderate', probability: 'Low', impact: 'i', mitigation: 'm' },
      ],
    })

    expect(buildRiskSeverityDistribution(analysis)).toEqual([
      { label: 'Critical', value: 1 },
      { label: 'High', value: 1 },
      { label: 'Medium', value: 1 },
    ])
  })

  it('returns null when there is no risk analysis yet', () => {
    expect(buildRiskSeverityDistribution(null)).toBeNull()
  })

  it('returns null when the risk analysis exists but has no critical risks', () => {
    expect(buildRiskSeverityDistribution(risk({ critical_risks: [] }))).toBeNull()
  })
})

describe('riskLevelToPercent', () => {
  it('anchors each recognized risk bucket to a fixed percent', () => {
    expect(riskLevelToPercent('Critical')).toBe(92)
    expect(riskLevelToPercent('High')).toBe(70)
    expect(riskLevelToPercent('Medium')).toBe(40)
    expect(riskLevelToPercent('Low')).toBe(15)
  })

  it('returns null for missing risk level text', () => {
    expect(riskLevelToPercent(null)).toBeNull()
    expect(riskLevelToPercent(undefined)).toBeNull()
    expect(riskLevelToPercent('')).toBeNull()
  })
})

describe('deploymentReadinessPercent', () => {
  it('averages confidence with inverted risk when both are available', () => {
    // confidence 80, risk 40 -> inverted risk 60 -> average 70
    expect(deploymentReadinessPercent(80, 'Medium')).toBe(70)
  })

  it('falls back to confidence alone when risk level is unavailable', () => {
    expect(deploymentReadinessPercent(80, null)).toBe(80)
  })

  it('returns null when confidence itself is unavailable', () => {
    expect(deploymentReadinessPercent(null, 'Medium')).toBeNull()
  })
})

describe('buildRecommendationCategories', () => {
  it('counts each present stage’s recommendation-like items', () => {
    const analysis = baseAnalysis({
      business_analysis: { business_problem: 'p', key_opportunities: [], important_metrics: [], recommended_next_steps: ['a', 'b'], ...output(0.8) },
      risk_analysis: risk({ recommended_mitigations: ['m'] }),
    })

    expect(buildRecommendationCategories(analysis)).toEqual([
      { label: 'Business Next Steps', value: 2 },
      { label: 'Risk Mitigations', value: 1 },
    ])
  })

  it('returns null when there is no analysis at all', () => {
    expect(buildRecommendationCategories(null)).toBeNull()
  })
})

describe('buildBusinessImpactWaterfallSteps', () => {
  it('accumulates a step per stage that contributed at least one item', () => {
    const analysis = baseAnalysis({
      business_analysis: { business_problem: 'p', key_opportunities: [], important_metrics: [], recommended_next_steps: ['a'], ...output(0.8) },
      executive_analysis: { executive_summary: 's', key_findings: [], trade_offs: [], final_recommendation: 'r', ...output(0.8) },
    })

    expect(buildBusinessImpactWaterfallSteps(analysis)).toEqual([
      { label: 'Business', value: 1 },
      { label: 'Executive', value: 1 },
    ])
  })

  it('returns null when no analysis is available', () => {
    expect(buildBusinessImpactWaterfallSteps(null)).toBeNull()
  })

  it('returns null when every present stage contributed zero items', () => {
    const analysis = baseAnalysis({
      business_analysis: { business_problem: 'p', key_opportunities: [], important_metrics: [], recommended_next_steps: [], ...output(0.8) },
    })

    expect(buildBusinessImpactWaterfallSteps(analysis)).toBeNull()
  })
})

describe('buildDatasetQualityRadar', () => {
  it('derives five real axes from profiled/validated/indexed dataset state', () => {
    const datasets = [
      dataset({
        upload_status: 'ready',
        index: {
          id: 'idx-1',
          dataset_id: 'dataset-1',
          status: 'indexed',
          chunk_count: 4,
          embedding_model: 'text-embedding-3-small',
          error_message: null,
          indexed_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      }),
    ]

    const radar = buildDatasetQualityRadar(datasets)

    expect(radar).toEqual([
      { axis: 'Completeness', value: 100 },
      { axis: 'Uniqueness', value: 100 },
      { axis: 'Validation', value: 100 },
      { axis: 'Indexing', value: 100 },
      { axis: 'Profiling', value: 100 },
    ])
  })

  it('returns null when no dataset is attached yet', () => {
    expect(buildDatasetQualityRadar([])).toBeNull()
  })

  it('returns null when datasets exist but none have finished profiling', () => {
    expect(buildDatasetQualityRadar([dataset({ profile: null })])).toBeNull()
  })
})

describe('buildMissionHealthScore / buildBusinessReadiness', () => {
  it('averages the real underlying metrics rather than inventing a score', () => {
    const analysis = baseAnalysis({
      business_analysis: { business_problem: 'p', key_opportunities: [], important_metrics: [], recommended_next_steps: [], ...output(0.9, ['e']) },
      strategy_analysis: { strategic_objectives: [], recommended_initiatives: [], implementation_roadmap: [], kpis: [], business_impact: 'b', priority: 'High', ...output(0.9, ['e']) },
      risk_analysis: risk({ ...output(0.9, ['e']) }),
      executive_analysis: { executive_summary: 's', key_findings: [], trade_offs: [], final_recommendation: 'r', ...output(0.9, ['e']) },
    })
    const datasets = [dataset()]

    expect(buildMissionHealthScore(analysis, datasets)).not.toBeNull()
    expect(buildBusinessReadiness(analysis, datasets)).not.toBeNull()
  })

  it('returns null for a mission with no analysis and no datasets', () => {
    expect(buildMissionHealthScore(null, [])).toBeNull()
    expect(buildBusinessReadiness(null, [])).toBeNull()
  })
})

describe('buildEvidenceSourceMentions', () => {
  it('counts real substring mentions of each retrieved source across every agent’s evidence', () => {
    const analysis = baseAnalysis({
      retrieval_stats: {
        query: 'q',
        top_k: 6,
        chunks_retrieved: 6,
        average_similarity_score: 0.5,
        retrieval_time_ms: 100,
        sources: ['sales.csv', 'stores.csv'],
        embedding_model: 'text-embedding-3-small',
        vector_store: 'ChromaDB',
      },
      business_analysis: {
        business_problem: 'p',
        key_opportunities: [],
        important_metrics: [],
        recommended_next_steps: [],
        ...output(0.8, ['Grounded in sales.csv rows', 'Also cites sales.csv again']),
      },
    })

    expect(buildEvidenceSourceMentions(analysis)).toEqual([
      { label: 'sales.csv', value: 2 },
      { label: 'stores.csv', value: 0 },
    ])
  })

  it('returns null when retrieval never produced any sources', () => {
    expect(buildEvidenceSourceMentions(baseAnalysis())).toBeNull()
  })
})

describe('dataset-level analytics (Data Library)', () => {
  it('buildDatasetSizeSeries sorts largest first and caps at 8', () => {
    const datasets = [
      dataset({ id: 'a', original_filename: 'small.csv', file_size: 1024 }),
      dataset({ id: 'b', original_filename: 'big.csv', file_size: 4096 }),
    ]

    expect(buildDatasetSizeSeries(datasets)).toEqual([
      { label: 'big.csv', value: 4 },
      { label: 'small.csv', value: 1 },
    ])
  })

  it('buildDatasetSizeSeries returns null with no datasets', () => {
    expect(buildDatasetSizeSeries([])).toBeNull()
  })

  it('buildRowsVsColumnsSeries reads real profile counts', () => {
    const datasets = [dataset({ profile: { ...dataset().profile!, row_count: 260, column_count: 8 } })]

    expect(buildRowsVsColumnsSeries(datasets)).toEqual([{ label: 'sales.csv', rows: 260, columns: 8 }])
  })

  it('buildRowsVsColumnsSeries returns null when nothing has been profiled', () => {
    expect(buildRowsVsColumnsSeries([dataset({ profile: null })])).toBeNull()
  })

  it('buildMissingValuesSeries sums missing counts and drops zero-missing datasets', () => {
    const datasets = [
      dataset({ id: 'a', original_filename: 'clean.csv', profile: { ...dataset().profile!, missing_values: {} } }),
      dataset({ id: 'b', original_filename: 'dirty.csv', profile: { ...dataset().profile!, missing_values: { col: 5, col2: 3 } } }),
    ]

    expect(buildMissingValuesSeries(datasets)).toEqual([{ label: 'dirty.csv', value: 8 }])
  })

  it('buildMissingValuesSeries returns null when every dataset is fully complete', () => {
    expect(buildMissingValuesSeries([dataset()])).toBeNull()
  })

  it('buildDuplicateDistribution reports duplicate percent and a real caption', () => {
    const datasets = [dataset({ profile: { ...dataset().profile!, row_count: 100, duplicate_row_count: 25 } })]

    expect(buildDuplicateDistribution(datasets)).toEqual([
      { label: 'sales.csv', value: 25, caption: '25 of 100 rows' },
    ])
  })

  it('buildDuplicateDistribution returns null when nothing has duplicates', () => {
    expect(buildDuplicateDistribution([dataset()])).toBeNull()
  })

  it('buildCompletenessSeries computes percent complete per dataset', () => {
    const datasets = [dataset({ profile: { ...dataset().profile!, row_count: 100, column_count: 2, missing_values: { col: 20 } } })]

    expect(buildCompletenessSeries(datasets)).toEqual([{ label: 'sales.csv', value: 90 }])
  })

  it('buildCompletenessSeries returns null when nothing has been profiled', () => {
    expect(buildCompletenessSeries([dataset({ profile: null })])).toBeNull()
  })
})
