export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed'

export type ReportFormat = 'pdf' | 'html'

export interface BusinessAnalysis {
  business_problem: string
  key_opportunities: string[]
  important_metrics: string[]
  recommended_next_steps: string[]
  confidence: number
  evidence_used: string[]
}

export interface StrategyAnalysis {
  strategic_objectives: string[]
  recommended_initiatives: string[]
  implementation_roadmap: string[]
  kpis: string[]
  business_impact: string
  priority: string
  confidence: number
  evidence_used: string[]
}

export interface RiskItem {
  title: string
  category: string
  severity: string
  probability: string
  impact: string
  mitigation: string
}

export interface RiskAnalysis {
  critical_risks: RiskItem[]
  assumptions: string[]
  recommended_mitigations: string[]
  overall_risk_level: string
  confidence: number
  evidence_used: string[]
}

export interface ExecutiveAnalysis {
  executive_summary: string
  key_findings: string[]
  trade_offs: string[]
  final_recommendation: string
  confidence: number
  evidence_used: string[]
}

/** Structural shape shared by all four agent outputs — every one of them
 * carries its own confidence score and evidence citations, which is all
 * the explainability views need to treat them uniformly. */
export interface AnalysisOutput {
  confidence: number
  evidence_used: string[]
}

export interface RetrievalStats {
  query: string
  top_k: number
  chunks_retrieved: number
  average_similarity_score: number | null
  retrieval_time_ms: number
  sources: string[]
  embedding_model: string
  vector_store: string
  /** How many distinct retrieval calls this snapshot combines. Absent on
   * analyses persisted before per-agent retrieval existed (when every run
   * genuinely made exactly one shared call). */
  query_count?: number
  /** Maps stage name ("business"/"strategy"/"risk"/"executive") to how many
   * chunks that stage's own context ultimately contained. Absent/empty on
   * analyses persisted before per-agent retrieval existed — callers should
   * fall back to `chunks_retrieved` (the old shared total) in that case,
   * mirroring `app.reports.derive.build_agent_collaboration`'s fallback. */
  per_agent_chunks?: Record<string, number>
}

export interface MissionAnalysis {
  id: string
  mission_id: string
  status: AnalysisStatus
  business_analysis: BusinessAnalysis | null
  strategy_analysis: StrategyAnalysis | null
  risk_analysis: RiskAnalysis | null
  executive_analysis: ExecutiveAnalysis | null
  retrieval_stats: RetrievalStats | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export const NON_TERMINAL_ANALYSIS_STATUSES: AnalysisStatus[] = ['pending', 'running']

/** The frontend's view of analysis status also includes "not started" —
 * there is no backend value for this; it's what we show when
 * `GET /missions/{id}/analysis` returns 404 (no analysis has ever run). */
export type AnalysisViewStatus = 'not_started' | AnalysisStatus
