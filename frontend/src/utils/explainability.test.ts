import { describe, expect, it } from 'vitest'
import { buildDecisionTraceStages, buildExplainabilityCards, evidenceQualityLabel, evidenceQualityVariant } from './explainability'
import type { MissionAnalysis, RetrievalStats } from '../types/Analysis'
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

function completedAnalysis(retrieval_stats: RetrievalStats | null = null): MissionAnalysis {
  return baseAnalysis({
    business_analysis: {
      business_problem: 'Store 1 underperforms',
      key_opportunities: ['Targeted marketing'],
      important_metrics: [],
      recommended_next_steps: ['Launch a campaign', 'Audit pricing'],
      ...output(0.8, ['evidence a']),
    },
    strategy_analysis: {
      strategic_objectives: ['Close the gap'],
      recommended_initiatives: ['Run a 6-week campaign'],
      implementation_roadmap: [],
      kpis: [],
      business_impact: 'Recovers $50k/quarter',
      priority: 'High',
      ...output(0.75),
    },
    risk_analysis: {
      critical_risks: [],
      assumptions: ['Demand stays stable'],
      recommended_mitigations: ['Monitor weekly sales'],
      overall_risk_level: 'Medium',
      ...output(0.7),
    },
    executive_analysis: {
      executive_summary: 'Store 1 is the priority',
      key_findings: [],
      trade_offs: ['Speed vs cost'],
      final_recommendation: 'Approve the campaign',
      ...output(0.72),
    },
    retrieval_stats,
  })
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
    profile: null,
    index: null,
    ...overrides,
  }
}

describe('buildExplainabilityCards', () => {
  it('builds one card per recommendation-bearing item across all four agents', () => {
    const cards = buildExplainabilityCards(completedAnalysis())

    // 2 business next steps + 1 strategy initiative + 1 risk mitigation + 1 executive recommendation
    expect(cards).toHaveLength(5)
    expect(cards.map((c) => c.title)).toEqual([
      'Launch a campaign',
      'Audit pricing',
      'Run a 6-week campaign',
      'Monitor weekly sales',
      'Approve the campaign',
    ])
    expect(cards[0]!.agentName).toBe('Business')
    expect(cards[0]!.confidencePercent).toBe(80)
    expect(cards[2]!.agentName).toBe('Strategy')
    expect(cards[4]!.agentName).toBe('Executive')
  })

  it('shares one mission-wide evidence-coverage figure across every card', () => {
    // Only business_analysis has evidence -- 1 of 4 stages -> 25%.
    const cards = buildExplainabilityCards(completedAnalysis())

    for (const card of cards) {
      expect(card.evidenceCoveragePercent).toBe(25)
    }
  })

  it('surfaces retrieval_stats fields (sources/embedding model/similarity) when present', () => {
    const cards = buildExplainabilityCards(
      completedAnalysis({
        query: 'q',
        top_k: 6,
        chunks_retrieved: 6,
        average_similarity_score: 0.842,
        retrieval_time_ms: 100,
        sources: ['sales.csv'],
        embedding_model: 'text-embedding-3-small',
        vector_store: 'ChromaDB',
      })
    )

    expect(cards[0]!.datasetsUsed).toEqual(['sales.csv'])
    expect(cards[0]!.embeddingModel).toBe('text-embedding-3-small')
    expect(cards[0]!.similarityScorePercent).toBe(84)
  })

  it('returns an empty list when the analysis has not fully completed yet', () => {
    const analysis = baseAnalysis({
      business_analysis: {
        business_problem: 'p',
        key_opportunities: [],
        important_metrics: [],
        recommended_next_steps: ['step'],
        ...output(0.8),
      },
      // strategy/risk/executive still null -- pipeline still running
    })

    expect(buildExplainabilityCards(analysis)).toEqual([])
  })
})

describe('evidenceQualityLabel / evidenceQualityVariant', () => {
  it('labels by count boundaries', () => {
    expect(evidenceQualityLabel(0)).toBe('No Evidence')
    expect(evidenceQualityLabel(1)).toBe('Limited Evidence')
    expect(evidenceQualityLabel(2)).toBe('Limited Evidence')
    expect(evidenceQualityLabel(3)).toBe('Strong Evidence')
  })

  it('maps the same boundaries to badge variants', () => {
    expect(evidenceQualityVariant(0)).toBe('neutral')
    expect(evidenceQualityVariant(2)).toBe('warning')
    expect(evidenceQualityVariant(3)).toBe('success')
  })
})

describe('buildDecisionTraceStages', () => {
  it('reports every stage complete when datasets are indexed and all four agents have output', () => {
    const datasets = [
      dataset({
        upload_status: 'ready',
        index: {
          id: 'idx-1',
          dataset_id: 'dataset-1',
          status: 'indexed',
          chunk_count: 12,
          embedding_model: 'text-embedding-3-small',
          error_message: null,
          indexed_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      }),
    ]
    const analysis = completedAnalysis({
      query: 'q',
      top_k: 6,
      chunks_retrieved: 6,
      average_similarity_score: 0.5,
      retrieval_time_ms: 100,
      sources: ['sales.csv'],
      embedding_model: 'text-embedding-3-small',
      vector_store: 'ChromaDB',
    })

    const stages = buildDecisionTraceStages(datasets, analysis)
    const byId = Object.fromEntries(stages.map((s) => [s.id, s]))

    expect(byId.dataset!.status).toBe('complete')
    expect(byId.chunks!.status).toBe('complete')
    expect(byId.chunks!.detail).toEqual(['12 chunks indexed'])
    expect(byId.embeddings!.status).toBe('complete')
    expect(byId.retrieval!.status).toBe('complete')
    expect(byId.business!.status).toBe('complete')
    expect(byId.final!.status).toBe('complete')
  })

  it('reports every stage not_available for a mission with no datasets and no analysis output', () => {
    const stages = buildDecisionTraceStages([], baseAnalysis())
    const byId = Object.fromEntries(stages.map((s) => [s.id, s]))

    expect(byId.dataset!.status).toBe('not_available')
    expect(byId.dataset!.detail).toEqual(['Not Available'])
    expect(byId.chunks!.status).toBe('not_available')
    expect(byId.retrieval!.status).toBe('not_available')
    expect(byId.business!.status).toBe('not_available')
    expect(byId.final!.status).toBe('not_available')
  })
})
