import { describe, expect, it } from 'vitest'
import { buildAgentBoardCards } from './collaborationCenter'
import type { MissionAnalysis, RetrievalStats } from '../types/Analysis'

function output() {
  return { confidence: 0.8, evidence_used: ['some evidence'] }
}

function baseAnalysis(retrieval_stats: RetrievalStats | null): MissionAnalysis {
  return {
    id: 'analysis-1',
    mission_id: 'mission-1',
    status: 'completed',
    business_analysis: {
      business_problem: 'p',
      key_opportunities: [],
      important_metrics: [],
      recommended_next_steps: [],
      ...output(),
    },
    strategy_analysis: {
      strategic_objectives: [],
      recommended_initiatives: [],
      implementation_roadmap: [],
      kpis: [],
      business_impact: 'b',
      priority: 'High',
      ...output(),
    },
    risk_analysis: {
      critical_risks: [],
      assumptions: [],
      recommended_mitigations: [],
      overall_risk_level: 'Medium',
      ...output(),
    },
    executive_analysis: {
      executive_summary: 'e',
      key_findings: [],
      trade_offs: [],
      final_recommendation: 'f',
      ...output(),
    },
    retrieval_stats,
    error_message: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function retrievalStats(overrides: Partial<RetrievalStats> = {}): RetrievalStats {
  return {
    query: 'q',
    top_k: 6,
    chunks_retrieved: 18,
    average_similarity_score: 0.5,
    retrieval_time_ms: 100,
    sources: ['data.csv'],
    embedding_model: 'text-embedding-3-small',
    vector_store: 'ChromaDB',
    ...overrides,
  }
}

describe('buildAgentBoardCards chunksRetrieved', () => {
  it('shows each agent its own real per-agent chunk count, not one shared number', () => {
    const analysis = baseAnalysis(
      retrievalStats({
        chunks_retrieved: 18,
        per_agent_chunks: { business: 6, strategy: 6, risk: 6, executive: 8 },
      })
    )

    const cards = buildAgentBoardCards(analysis)
    const byName = Object.fromEntries(cards.map((card) => [card.agentName, card.chunksRetrieved]))

    expect(byName.Business).toBe(6)
    expect(byName.Strategy).toBe(6)
    expect(byName.Risk).toBe(6)
    expect(byName.Executive).toBe(8)
    // The whole point of this fix: not every card shows the same number.
    expect(new Set(cards.map((card) => card.chunksRetrieved)).size).toBeGreaterThan(1)
  })

  it('falls back to the shared total when per_agent_chunks is absent (pre-existing analyses)', () => {
    const analysis = baseAnalysis(retrievalStats({ chunks_retrieved: 12, per_agent_chunks: undefined }))

    const cards = buildAgentBoardCards(analysis)

    for (const card of cards) {
      expect(card.chunksRetrieved).toBe(12)
    }
  })

  it('falls back to the shared total when per_agent_chunks is present but empty', () => {
    const analysis = baseAnalysis(retrievalStats({ chunks_retrieved: 12, per_agent_chunks: {} }))

    const cards = buildAgentBoardCards(analysis)

    for (const card of cards) {
      expect(card.chunksRetrieved).toBe(12)
    }
  })

  it('falls back to the shared total for a stage missing from an otherwise-populated map', () => {
    const analysis = baseAnalysis(
      retrievalStats({
        chunks_retrieved: 12,
        per_agent_chunks: { business: 6, strategy: 6 }, // risk/executive missing
      })
    )

    const cards = buildAgentBoardCards(analysis)
    const byName = Object.fromEntries(cards.map((card) => [card.agentName, card.chunksRetrieved]))

    expect(byName.Business).toBe(6)
    expect(byName.Strategy).toBe(6)
    expect(byName.Risk).toBe(12)
    expect(byName.Executive).toBe(12)
  })

  it('returns null for every card when there is no retrieval_stats at all', () => {
    const analysis = baseAnalysis(null)

    const cards = buildAgentBoardCards(analysis)

    for (const card of cards) {
      expect(card.chunksRetrieved).toBeNull()
    }
  })
})
