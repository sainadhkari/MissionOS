import type { AnalysisOutput, MissionAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'
import type { Mission } from '../types/Mission'
import { computeDatasetQuality } from './executiveDashboard'
import type { DatasetQuality } from './executiveDashboard'

export type AgentName = 'Business' | 'Strategy' | 'Risk' | 'Executive'

export const AGENT_ORDER: AgentName[] = ['Business', 'Strategy', 'Risk', 'Executive']

/** Real, fixed dependency chain of the hand-rolled pipeline (Business →
 * Strategy → Risk → Executive, each consuming the prior agents' output) —
 * this is architecture, not per-run data, so it's safe to state as a
 * constant rather than something that needs "Not Available" fallback. */
const AGENT_DEPENDENCIES: Record<AgentName, AgentName[]> = {
  Business: [],
  Strategy: ['Business'],
  Risk: ['Business', 'Strategy'],
  Executive: ['Business', 'Strategy', 'Risk'],
}

function agentOutput(analysis: MissionAnalysis, agentName: AgentName): AnalysisOutput | null {
  switch (agentName) {
    case 'Business':
      return analysis.business_analysis
    case 'Strategy':
      return analysis.strategy_analysis
    case 'Risk':
      return analysis.risk_analysis
    case 'Executive':
      return analysis.executive_analysis
  }
}

// ---------------------------------------------------------------------------
// Section 2 — Live AI Pipeline
// ---------------------------------------------------------------------------

export type PipelineStatus = 'completed' | 'processing' | 'waiting' | 'failed' | 'not_available'

export interface PipelineStage {
  id: string
  label: string
  status: PipelineStatus
  detail: string[]
}

/** Every stage is derived from data the backend already persists — dataset
 * upload/validation/profile/index status, retrieval stats, and which agent
 * outputs are non-null. The backend doesn't record chunking, embedding, and
 * ChromaDB storage as separate steps (only one composite RAG index status),
 * so those three stages honestly share that one status rather than
 * pretending to know a finer-grained breakdown. Likewise there's no
 * per-agent "currently running" flag — while the overall analysis is
 * `running`, the first agent without an output yet is inferred as
 * "processing" from the known sequential order, and the rest are "waiting". */
export function buildPipelineStages(datasets: Dataset[], analysis: MissionAnalysis | null): PipelineStage[] {
  const hasDatasets = datasets.length > 0
  const validating = datasets.some((d) => d.upload_status === 'validating')
  const anyReadyWithProfile = datasets.some((d) => d.upload_status === 'ready' && d.profile)
  const anyValidationFailed = datasets.some((d) => d.upload_status === 'failed')

  const indexed = datasets.filter((d) => d.index?.status === 'indexed')
  const indexing = datasets.some((d) => d.index?.status === 'indexing')
  const indexPending = datasets.some((d) => d.index?.status === 'pending')
  const indexFailed = datasets.some((d) => d.index?.status === 'failed')
  const totalChunks = indexed.reduce((sum, d) => sum + (d.index?.chunk_count ?? 0), 0)
  const embeddingModel = indexed.find((d) => d.index?.embedding_model)?.index?.embedding_model ?? null

  const indexStageStatus: PipelineStatus = indexed.length > 0 ? 'completed' : indexing ? 'processing' : indexFailed ? 'failed' : indexPending ? 'waiting' : 'not_available'
  const indexDetail =
    indexed.length > 0
      ? [`${totalChunks} chunks`, embeddingModel ?? 'Not Available']
      : indexFailed
        ? ['Indexing failed on one or more datasets']
        : ['Not Available']

  const retrieval = analysis?.retrieval_stats ?? null
  const analysisRunning = analysis?.status === 'running'
  const analysisPending = analysis?.status === 'pending'

  const retrievalStatus: PipelineStatus = retrieval
    ? 'completed'
    : analysisRunning || analysisPending
      ? 'processing'
      : indexed.length > 0
        ? 'waiting'
        : 'not_available'

  // The first agent (in fixed pipeline order) without an output yet, while
  // the overall analysis is still running, is the one currently executing.
  const firstIncompleteIndex = analysis
    ? AGENT_ORDER.findIndex((name) => agentOutput(analysis, name) === null)
    : 0

  function agentStageStatus(index: number): PipelineStatus {
    if (!analysis) return 'not_available'
    const name = AGENT_ORDER[index]!
    if (agentOutput(analysis, name) !== null) return 'completed'
    if (analysis.status === 'failed') return 'failed'
    if (analysisRunning && index === firstIncompleteIndex) return 'processing'
    if (analysisRunning || analysisPending) return 'waiting'
    return 'not_available'
  }

  function agentStageDetail(index: number): string[] {
    const name = AGENT_ORDER[index]!
    const output = analysis ? agentOutput(analysis, name) : null
    if (!output) return ['Not Available']
    return [`${Math.round(output.confidence * 100)}% confidence`, `${output.evidence_used.length} citations`]
  }

  return [
    {
      id: 'dataset-uploaded',
      label: 'Dataset Uploaded',
      status: hasDatasets ? 'completed' : 'waiting',
      detail: hasDatasets ? [`${datasets.length} dataset${datasets.length === 1 ? '' : 's'}`] : ['Not Available'],
    },
    {
      id: 'dataset-profiled',
      label: 'Dataset Profiled',
      status: anyReadyWithProfile ? 'completed' : validating ? 'processing' : anyValidationFailed ? 'failed' : hasDatasets ? 'waiting' : 'not_available',
      detail: anyReadyWithProfile
        ? [`${datasets.filter((d) => d.profile).length} profiled`]
        : ['Not Available'],
    },
    {
      id: 'chunk-generation',
      label: 'Chunk Generation',
      status: indexStageStatus,
      detail: indexed.length > 0 ? [`${totalChunks} chunks`] : indexDetail,
    },
    {
      id: 'embedding-generation',
      label: 'Embedding Generation',
      status: indexStageStatus,
      detail: embeddingModel ? [embeddingModel] : indexDetail,
    },
    {
      id: 'chromadb-storage',
      label: 'Stored in ChromaDB',
      status: indexStageStatus,
      detail: indexed.length > 0 ? [`${indexed.length} dataset${indexed.length === 1 ? '' : 's'} indexed`] : indexDetail,
    },
    {
      id: 'semantic-retrieval',
      label: 'Semantic Retrieval',
      status: retrievalStatus,
      detail: retrieval
        ? [`${retrieval.chunks_retrieved} of top-${retrieval.top_k} retrieved`]
        : ['Not Available'],
    },
    {
      id: 'business-agent',
      label: 'Business Agent',
      status: agentStageStatus(0),
      detail: agentStageDetail(0),
    },
    {
      id: 'strategy-agent',
      label: 'Strategy Agent',
      status: agentStageStatus(1),
      detail: agentStageDetail(1),
    },
    {
      id: 'risk-agent',
      label: 'Risk Agent',
      status: agentStageStatus(2),
      detail: agentStageDetail(2),
    },
    {
      id: 'executive-agent',
      label: 'Executive Agent',
      status: agentStageStatus(3),
      detail: agentStageDetail(3),
    },
    {
      id: 'executive-report',
      label: 'Executive Report',
      status: 'not_available',
      detail: ['Report export isn’t tracked as a pipeline event — generate it from the Executive Dashboard'],
    },
  ]
}

// ---------------------------------------------------------------------------
// Section 3 — Agent Collaboration Board
// ---------------------------------------------------------------------------

export interface AgentBoardCard {
  agentName: AgentName
  status: 'Complete' | 'Not Available'
  confidencePercent: number | null
  evidenceCount: number | null
  chunksRetrieved: number | null
  reasoningSummary: string | null
  businessImpact: string | null
  recommendationsCount: number | null
  risksCount: number | null
  supportingEvidence: string[]
  executionOrder: number
  dependencies: AgentName[]
  executionTime: string | null
}

/** That agent's own genuine retrieved-chunk count (each stage retrieves
 * independently with its own query — see `app.ai.orchestrator.
 * AnalysisOrchestrator.run` on the backend), sourced from
 * `retrieval_stats.per_agent_chunks`. Falls back to the same shared total
 * on every card for analyses persisted before per-agent retrieval existed
 * (when `per_agent_chunks` wasn't captured) — mirrors
 * `app.reports.derive.build_agent_collaboration`'s
 * `per_agent_chunks.get(stage_key, shared_total)` fallback exactly, so this
 * view and the Executive Report never show different numbers for the same
 * analysis. */
function chunksRetrievedFor(analysis: MissionAnalysis | null, agentName: AgentName): number | null {
  const retrieval = analysis?.retrieval_stats
  if (!retrieval) return null
  const stageKey = agentName.toLowerCase()
  return retrieval.per_agent_chunks?.[stageKey] ?? retrieval.chunks_retrieved
}

export function buildAgentBoardCards(analysis: MissionAnalysis | null): AgentBoardCard[] {
  return AGENT_ORDER.map((agentName, index) => {
    const output = analysis ? agentOutput(analysis, agentName) : null

    let reasoningSummary: string | null = null
    let businessImpact: string | null = null
    let recommendationsCount: number | null = null
    let risksCount: number | null = null

    if (analysis?.business_analysis && agentName === 'Business') {
      reasoningSummary = analysis.business_analysis.business_problem || null
      recommendationsCount = analysis.business_analysis.recommended_next_steps.length
    }
    if (analysis?.strategy_analysis && agentName === 'Strategy') {
      reasoningSummary = analysis.strategy_analysis.business_impact || null
      businessImpact = analysis.strategy_analysis.business_impact || null
      recommendationsCount = analysis.strategy_analysis.recommended_initiatives.length
    }
    if (analysis?.risk_analysis && agentName === 'Risk') {
      reasoningSummary = analysis.risk_analysis.overall_risk_level
        ? `Overall risk level assessed as ${analysis.risk_analysis.overall_risk_level}.`
        : null
      recommendationsCount = analysis.risk_analysis.recommended_mitigations.length
      risksCount = analysis.risk_analysis.critical_risks.length
    }
    if (analysis?.executive_analysis && agentName === 'Executive') {
      reasoningSummary = analysis.executive_analysis.executive_summary || null
      businessImpact = analysis.strategy_analysis?.business_impact || null
    }

    return {
      agentName,
      status: output ? 'Complete' : 'Not Available',
      confidencePercent: output ? Math.round(output.confidence * 100) : null,
      evidenceCount: output ? output.evidence_used.length : null,
      chunksRetrieved: chunksRetrievedFor(analysis, agentName),
      reasoningSummary,
      businessImpact,
      recommendationsCount,
      risksCount,
      supportingEvidence: output?.evidence_used ?? [],
      executionOrder: index + 1,
      dependencies: AGENT_DEPENDENCIES[agentName],
      // The backend only persists overall analysis started_at/completed_at,
      // never a per-agent duration, so this is always "Not Available" rather
      // than an invented split of the total runtime.
      executionTime: null,
    }
  })
}

// ---------------------------------------------------------------------------
// Section 4 — Consensus Dashboard
// ---------------------------------------------------------------------------

export interface ConsensusMetrics {
  businessConfidence: number | null
  strategyConfidence: number | null
  riskConfidence: number | null
  executiveConfidence: number | null
  overallConfidence: number | null
  evidenceCoveragePercent: number | null
  agentAgreementPercent: number | null
  decisionStrengthPercent: number | null
  datasetQuality: DatasetQuality | null
}

export function buildConsensusMetrics(analysis: MissionAnalysis | null, datasets: Dataset[]): ConsensusMetrics {
  const confidences = analysis
    ? AGENT_ORDER.map((name) => agentOutput(analysis, name)?.confidence ?? null)
    : [null, null, null, null]
  const [businessConfidence, strategyConfidence, riskConfidence, executiveConfidence] = confidences.map((c) =>
    c !== null ? Math.round(c * 100) : null
  )

  const presentConfidences = confidences.filter((c): c is number => c !== null)
  const overallConfidence =
    presentConfidences.length > 0
      ? Math.round((presentConfidences.reduce((sum, c) => sum + c, 0) / presentConfidences.length) * 100)
      : null

  const outputs = analysis ? AGENT_ORDER.map((name) => agentOutput(analysis, name)).filter((o): o is AnalysisOutput => o !== null) : []
  const evidenceCoveragePercent =
    outputs.length > 0 ? Math.round((outputs.filter((o) => o.evidence_used.length > 0).length / outputs.length) * 100) : null

  // Agreement is derived from how tightly clustered the four confidence
  // scores are — a real, reproducible spread calculation, not an opinion.
  const agentAgreementPercent =
    presentConfidences.length >= 2
      ? Math.round((1 - (Math.max(...presentConfidences) - Math.min(...presentConfidences))) * 100)
      : presentConfidences.length === 1
        ? 100
        : null

  const datasetQuality = computeDatasetQuality(datasets)

  // Decision Strength is a transparent composite of the three metrics
  // above (confidence, evidence coverage, agreement) — all real, all
  // already shown individually on this same dashboard.
  const strengthInputs = [overallConfidence, evidenceCoveragePercent, agentAgreementPercent].filter(
    (v): v is number => v !== null
  )
  const decisionStrengthPercent =
    strengthInputs.length > 0 ? Math.round(strengthInputs.reduce((sum, v) => sum + v, 0) / strengthInputs.length) : null

  return {
    businessConfidence,
    strategyConfidence,
    riskConfidence,
    executiveConfidence,
    overallConfidence,
    evidenceCoveragePercent,
    agentAgreementPercent,
    decisionStrengthPercent,
    datasetQuality,
  }
}

// ---------------------------------------------------------------------------
// Section 5 — Knowledge Contribution
// ---------------------------------------------------------------------------

export interface KnowledgeContributionEntry {
  agentName: AgentName
  percent: number | null
  evidenceCount: number
}

/** Each agent's "contribution" is its share of the total evidence
 * citations used across all four agents — a real, countable figure already
 * stored per agent (`evidence_used`), not an invented weighting. If no
 * agent has cited any evidence, every share is `null` (Not Available)
 * rather than defaulting to an even split that would imply data that
 * doesn't exist. */
export function buildKnowledgeContribution(analysis: MissionAnalysis | null): KnowledgeContributionEntry[] {
  const counts = AGENT_ORDER.map((name) => (analysis ? agentOutput(analysis, name)?.evidence_used.length ?? 0 : 0))
  const total = counts.reduce((sum, c) => sum + c, 0)

  return AGENT_ORDER.map((agentName, index) => ({
    agentName,
    percent: total > 0 ? Math.round((counts[index]! / total) * 100) : null,
    evidenceCount: counts[index]!,
  }))
}

// ---------------------------------------------------------------------------
// Section 7 — Execution Timeline
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  label: string
  /** ISO timestamp when the backend recorded one, `'completed'` when we
   * know the step finished but not exactly when, or `null` when we don't
   * even know that much. */
  timestamp: string | null
  completedFallback: boolean
}

export function buildExecutionTimeline(mission: Mission, datasets: Dataset[], analysis: MissionAnalysis | null): TimelineEntry[] {
  const earliestUpload = datasets
    .map((d) => d.created_at)
    .sort()[0]
  const earliestProfile = datasets
    .filter((d) => d.profile)
    .map((d) => d.profile!.created_at)
    .sort()[0]
  const indexedAt = datasets
    .filter((d) => d.index?.indexed_at)
    .map((d) => d.index!.indexed_at!)
    .sort()[0]

  const hasRetrieval = Boolean(analysis?.retrieval_stats)
  const hasBusiness = Boolean(analysis?.business_analysis)
  const hasStrategy = Boolean(analysis?.strategy_analysis)
  const hasRisk = Boolean(analysis?.risk_analysis)
  const hasExecutive = Boolean(analysis?.executive_analysis)

  function entry(label: string, timestamp: string | null | undefined, knownComplete: boolean): TimelineEntry {
    if (timestamp) return { label, timestamp, completedFallback: false }
    return { label, timestamp: null, completedFallback: knownComplete }
  }

  return [
    entry('Mission Created', mission.created_at, true),
    entry('Dataset Uploaded', earliestUpload, datasets.length > 0),
    entry('Profiling', earliestProfile, datasets.some((d) => d.profile)),
    entry('Chunking', indexedAt, datasets.some((d) => d.index?.status === 'indexed')),
    entry('Embedding', indexedAt, datasets.some((d) => d.index?.status === 'indexed')),
    entry('Retrieval', null, hasRetrieval),
    entry('Business Analysis', null, hasBusiness),
    entry('Strategy Analysis', null, hasStrategy),
    entry('Risk Analysis', null, hasRisk),
    entry('Executive Summary', analysis?.completed_at, hasExecutive),
    entry('Report Generated', null, false),
  ]
}

// ---------------------------------------------------------------------------
// Section 8 — Agent Conversation
// ---------------------------------------------------------------------------

export interface ConversationEntry {
  agentName: AgentName
  heading: string
  body: string | null
  confidencePercent: number | null
}

/** Each entry reuses the agent's own already-stored narrative output field
 * — never a newly generated response. */
export function buildAgentConversation(analysis: MissionAnalysis | null): ConversationEntry[] {
  return [
    {
      agentName: 'Business',
      heading: 'Business Problem Assessment',
      body: analysis?.business_analysis?.business_problem || null,
      confidencePercent: analysis?.business_analysis ? Math.round(analysis.business_analysis.confidence * 100) : null,
    },
    {
      agentName: 'Strategy',
      heading: 'Strategic Response',
      body: analysis?.strategy_analysis?.business_impact || null,
      confidencePercent: analysis?.strategy_analysis ? Math.round(analysis.strategy_analysis.confidence * 100) : null,
    },
    {
      agentName: 'Risk',
      heading: 'Risk Response',
      body: analysis?.risk_analysis
        ? `Overall risk level: ${analysis.risk_analysis.overall_risk_level}. ${analysis.risk_analysis.critical_risks.length} critical risk${analysis.risk_analysis.critical_risks.length === 1 ? '' : 's'} identified.`
        : null,
      confidencePercent: analysis?.risk_analysis ? Math.round(analysis.risk_analysis.confidence * 100) : null,
    },
    {
      agentName: 'Executive',
      heading: 'Final Decision',
      body: analysis?.executive_analysis?.final_recommendation || null,
      confidencePercent: analysis?.executive_analysis ? Math.round(analysis.executive_analysis.confidence * 100) : null,
    },
  ]
}

// ---------------------------------------------------------------------------
// Section 9 — Final Decision Card
// ---------------------------------------------------------------------------

/** A transparent, formula-based readout (confidence + risk level), not a
 * fabricated status — clearly distinct from "Expected ROI", which has no
 * grounding in any real backend field and must show "Not Available". */
export function deploymentReadinessLabel(overallConfidencePercent: number | null, overallRiskLevel: string | null): string | null {
  if (overallConfidencePercent === null) return null
  const risk = (overallRiskLevel ?? '').toLowerCase()
  const highRisk = risk.includes('critical') || risk.includes('high')

  if (overallConfidencePercent >= 80 && !highRisk) return 'Ready for Deployment'
  if (overallConfidencePercent >= 50) return 'Ready with Monitoring'
  return 'Needs Review'
}
