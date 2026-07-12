import type { BadgeVariant } from '../components/Badge'
import type { AnalysisOutput, MissionAnalysis } from '../types/Analysis'
import type { Dataset } from '../types/Dataset'

export type AgentName = 'Business' | 'Strategy' | 'Risk' | 'Executive'

export interface ExplainabilityCard {
  id: string
  title: string
  agentName: AgentName
  executiveSummary: string | null
  confidencePercent: number
  evidenceCount: number
  /** Share of the four agents (Business/Strategy/Risk/Executive) that cited
   * at least one piece of retrieved evidence — a mission-wide figure, the
   * same across every card, since evidence isn't tracked per recommendation
   * item on the backend. */
  evidenceCoveragePercent: number | null
  datasetsUsed: string[]
  /** The backend never assigns retrieved chunks a discrete ID — only an
   * aggregate count and similarity score are persisted — so this is always
   * `null` (rendered as "Not Available") rather than invented. */
  chunkIds: null
  embeddingModel: string | null
  similarityScorePercent: number | null
  businessImpact: string | null
  reasoning: string | null
  evidenceUsed: string[]
  traceability: string[]
  agentStatus: 'Complete' | 'Not Available'
}

export interface DecisionTraceStage {
  id: string
  label: string
  status: 'complete' | 'not_available'
  detail: string[]
}

function evidenceCoverage(analysis: MissionAnalysis): number | null {
  const outputs = [
    analysis.business_analysis,
    analysis.strategy_analysis,
    analysis.risk_analysis,
    analysis.executive_analysis,
  ].filter((output): output is NonNullable<typeof output> => output !== null)

  if (outputs.length === 0) return null
  const withEvidence = outputs.filter((output) => output.evidence_used.length > 0).length
  return Math.round((withEvidence / outputs.length) * 100)
}

function joinOrNull(items: string[]): string | null {
  return items.length > 0 ? items.join('; ') : null
}

/** Every recommendation-bearing item across all four agent outputs becomes
 * its own card. The backend only tracks confidence/evidence/reasoning at
 * the *agent* level (not per recommendation item), so cards from the same
 * agent share that agent's values — this is surfaced honestly rather than
 * invented per-item. Returns `[]` if the analysis isn't fully completed. */
export function buildExplainabilityCards(analysis: MissionAnalysis): ExplainabilityCard[] {
  const { business_analysis, strategy_analysis, risk_analysis, executive_analysis, retrieval_stats } = analysis
  if (!business_analysis || !strategy_analysis || !risk_analysis || !executive_analysis) return []

  const coveragePercent = evidenceCoverage(analysis)
  const datasetsUsed = retrieval_stats?.sources ?? []
  const embeddingModel = retrieval_stats?.embedding_model ?? null
  const similarityScorePercent =
    retrieval_stats?.average_similarity_score != null ? Math.round(retrieval_stats.average_similarity_score * 100) : null
  const businessImpact = strategy_analysis.business_impact || null

  function traceabilityFor(agentName: AgentName): string[] {
    return ['Dataset', 'Chunks', 'Embeddings', 'Retrieval', `${agentName} Agent`, 'Recommendation']
  }

  function baseFields(agentName: AgentName, confidence: number, evidenceUsed: string[]) {
    return {
      agentName,
      confidencePercent: Math.round(confidence * 100),
      evidenceCount: evidenceUsed.length,
      evidenceCoveragePercent: coveragePercent,
      datasetsUsed,
      chunkIds: null,
      embeddingModel,
      similarityScorePercent,
      businessImpact,
      evidenceUsed,
      traceability: traceabilityFor(agentName),
      agentStatus: 'Complete' as const,
    }
  }

  const cards: ExplainabilityCard[] = []

  business_analysis.recommended_next_steps.forEach((step, index) => {
    cards.push({
      id: `business-${index}`,
      title: step,
      executiveSummary: business_analysis.business_problem || null,
      reasoning: joinOrNull(business_analysis.key_opportunities)
        ? `Supported by identified opportunities: ${joinOrNull(business_analysis.key_opportunities)}`
        : null,
      ...baseFields('Business', business_analysis.confidence, business_analysis.evidence_used),
    })
  })

  strategy_analysis.recommended_initiatives.forEach((initiative, index) => {
    cards.push({
      id: `strategy-${index}`,
      title: initiative,
      executiveSummary: strategy_analysis.business_impact || null,
      reasoning: joinOrNull(strategy_analysis.strategic_objectives)
        ? `Aligned with strategic objectives: ${joinOrNull(strategy_analysis.strategic_objectives)}`
        : null,
      ...baseFields('Strategy', strategy_analysis.confidence, strategy_analysis.evidence_used),
    })
  })

  risk_analysis.recommended_mitigations.forEach((mitigation, index) => {
    cards.push({
      id: `risk-${index}`,
      title: mitigation,
      executiveSummary: risk_analysis.overall_risk_level
        ? `Overall risk level assessed as ${risk_analysis.overall_risk_level}.`
        : null,
      reasoning: joinOrNull(risk_analysis.assumptions)
        ? `Assumptions underpinning this assessment: ${joinOrNull(risk_analysis.assumptions)}`
        : null,
      ...baseFields('Risk', risk_analysis.confidence, risk_analysis.evidence_used),
    })
  })

  if (executive_analysis.final_recommendation) {
    cards.push({
      id: 'executive-0',
      title: executive_analysis.final_recommendation,
      executiveSummary: executive_analysis.executive_summary || null,
      reasoning: joinOrNull(executive_analysis.trade_offs)
        ? `Weighed trade-offs: ${joinOrNull(executive_analysis.trade_offs)}`
        : null,
      ...baseFields('Executive', executive_analysis.confidence, executive_analysis.evidence_used),
    })
  }

  return cards
}

export function evidenceQualityLabel(count: number): string {
  if (count === 0) return 'No Evidence'
  if (count <= 2) return 'Limited Evidence'
  return 'Strong Evidence'
}

export function evidenceQualityVariant(count: number): BadgeVariant {
  if (count === 0) return 'neutral'
  if (count <= 2) return 'warning'
  return 'success'
}

/** Walks the real, already-available pipeline signals (dataset validation →
 * RAG indexing → embeddings → retrieval → each of the four agents → the
 * final recommendation) so the trace is a live readout, not a static
 * diagram. Any stage the backend hasn't populated yet is reported as
 * "Not Available" rather than inferred. */
export function buildDecisionTraceStages(datasets: Dataset[], analysis: MissionAnalysis): DecisionTraceStage[] {
  const readyDatasets = datasets.filter((dataset) => dataset.upload_status === 'ready')
  const indexedDatasets = datasets.filter((dataset) => dataset.index?.status === 'indexed')
  const totalChunks = indexedDatasets.reduce((sum, dataset) => sum + (dataset.index?.chunk_count ?? 0), 0)
  const embeddingModel =
    analysis.retrieval_stats?.embedding_model ?? indexedDatasets.find((d) => d.index?.embedding_model)?.index?.embedding_model ?? null
  const retrieval = analysis.retrieval_stats

  function agentStage(agentName: AgentName, output: AnalysisOutput | null): DecisionTraceStage {
    return {
      id: agentName.toLowerCase(),
      label: `${agentName} Agent`,
      status: output ? 'complete' : 'not_available',
      detail: output
        ? [
            `Confidence ${Math.round(output.confidence * 100)}%`,
            `${output.evidence_used.length} evidence citation${output.evidence_used.length === 1 ? '' : 's'}`,
          ]
        : ['Not Available'],
    }
  }

  return [
    {
      id: 'dataset',
      label: 'Dataset',
      status: readyDatasets.length > 0 ? 'complete' : 'not_available',
      detail:
        readyDatasets.length > 0
          ? [`${readyDatasets.length} validated dataset${readyDatasets.length === 1 ? '' : 's'}`]
          : ['Not Available'],
    },
    {
      id: 'chunks',
      label: 'Chunks',
      status: totalChunks > 0 ? 'complete' : 'not_available',
      detail: totalChunks > 0 ? [`${totalChunks} chunks indexed`] : ['Not Available'],
    },
    {
      id: 'embeddings',
      label: 'Embeddings',
      status: embeddingModel ? 'complete' : 'not_available',
      detail: embeddingModel ? [embeddingModel] : ['Not Available'],
    },
    {
      id: 'retrieval',
      label: 'Retrieval',
      status: retrieval ? 'complete' : 'not_available',
      detail: retrieval
        ? [
            `${retrieval.chunks_retrieved} of top-${retrieval.top_k} chunks retrieved`,
            retrieval.average_similarity_score != null
              ? `${Math.round(retrieval.average_similarity_score * 100)}% avg. similarity`
              : 'Similarity: Not Available',
          ]
        : ['Not Available'],
    },
    agentStage('Business', analysis.business_analysis),
    agentStage('Strategy', analysis.strategy_analysis),
    agentStage('Risk', analysis.risk_analysis),
    agentStage('Executive', analysis.executive_analysis),
    {
      id: 'final',
      label: 'Final Recommendation',
      status: analysis.executive_analysis?.final_recommendation ? 'complete' : 'not_available',
      detail: analysis.executive_analysis?.final_recommendation
        ? [analysis.executive_analysis.final_recommendation]
        : ['Not Available'],
    },
  ]
}
