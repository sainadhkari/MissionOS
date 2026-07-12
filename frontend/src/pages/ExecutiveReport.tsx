import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  HeartPulse,
  Loader2,
  Printer,
  Quote,
  Rocket,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import KpiCard from '../components/KpiCard'
import RiskCategoryChart from '../components/RiskCategoryChart'
import DatasetSummaryChart from '../components/DatasetSummaryChart'
import BusinessAnalysisCard from '../components/BusinessAnalysisCard'
import StrategyCard from '../components/StrategyCard'
import RiskCard from '../components/RiskCard'
import ExecutiveSummaryCard from '../components/ExecutiveSummaryCard'
import ExplainabilityPanel from '../components/Explainability'
import ExecutiveRecommendationBanner from '../components/ExecutiveRecommendationBanner'
import Button, { buttonClasses } from '../components/Button'
import { ChartCard } from '../components/Charts'
import { BulletList } from '../components/AnalysisSection'
import {
  AgentCollaborationBoard,
  AgentConversationSection,
  ConsensusDashboard,
  EvidenceNetworkSection,
  KnowledgeContributionSection,
  LivePipelineSection,
} from '../components/CollaborationCenter'
import {
  AIConfidenceTrend,
  BusinessImpactWaterfall,
  DecisionStrengthGauge,
  EvidenceCoverageChart,
  AgentContributionChart,
  ExecutiveScorecard,
  KnowledgeContributionChart,
  RecommendationCategoryChart,
  RetrievalAnalyticsChart,
  RiskDistributionChart,
  TimelineChart,
} from '../components/analytics'
import { ReportSection } from '../components/ExecutiveReport'
import { useAnalysisPolling } from '../hooks/useAnalysisPolling'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { ROUTES, missionDetailsPath } from '../constants/routes'
import { formatDateTime } from '../utils/date'
import { severityBadgeVariant } from '../utils/analysis'
import { buildAgentBoardCards, buildAgentConversation, buildConsensusMetrics, buildKnowledgeContribution, buildPipelineStages } from '../utils/collaborationCenter'
import { buildMissionHealthScore, deploymentReadinessPercent } from '../utils/analyticsCharts'
import {
  averageConfidence,
  capitalize,
  computeDatasetQuality,
  confidenceBadgeVariant,
  confidenceLabel,
  topRecommendations,
  topRisks,
} from '../utils/executiveDashboard'
import type { Mission } from '../types/Mission'
import type { MissionAnalysis } from '../types/Analysis'

type MissionLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; mission: Mission }

/** The Executive Report is a print-friendly rendering of the exact same
 * data, components, and layout as the Executive Dashboard
 * (`pages/MissionReport.tsx`) — same hero banner, same KPI row, same three
 * analytics groups, same chart components, plus the sections that live on
 * other existing pages (Business/Strategy/Risk/Executive analysis cards,
 * AI Collaboration, Explainability, the pipeline timeline) so the report
 * is comprehensive without inventing any new visual language. */
function ExecutiveReport() {
  const { missionId } = useParams<{ missionId: string }>()
  const [missionState, setMissionState] = useState<MissionLoadState>({ status: 'loading' })
  const analysisPolling = useAnalysisPolling(missionId)
  const datasets = useMissionDatasets(missionId)

  useEffect(() => {
    if (!missionId) return
    missionService
      .get(missionId)
      .then((mission) => setMissionState({ status: 'success', mission }))
      .catch((err) => setMissionState({ status: 'error', message: getErrorMessage(err, 'Mission not found.') }))
  }, [missionId])

  if (missionState.status === 'loading' || analysisPolling.status === 'loading') {
    return (
      <div>
        <PageHeader title="Executive Report" />
        <Loading />
      </div>
    )
  }

  if (missionState.status === 'error') {
    return (
      <div>
        <PageHeader title="Executive Report" />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={missionState.message}
            action={
              <Link to={ROUTES.missionHistory} className={buttonClasses('outline', 'sm')}>
                Back to Mission History
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  if (analysisPolling.status === 'error') {
    return (
      <div>
        <PageHeader title="Executive Report" />
        <Card>
          <Banner variant="danger">{analysisPolling.message}</Banner>
        </Card>
      </div>
    )
  }

  const { mission } = missionState
  const analysis = analysisPolling.status === 'found' ? analysisPolling.analysis : null

  if (!analysis || analysis.status !== 'completed' || !analysis.business_analysis || !analysis.strategy_analysis || !analysis.risk_analysis || !analysis.executive_analysis) {
    return (
      <div>
        <PageHeader
          title="Executive Report"
          subtitle={mission.title}
          actions={
            <Link to={missionDetailsPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              Back to Mission
            </Link>
          }
        />
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Run AI analysis first"
            description="The Executive Report mirrors this mission's Executive Dashboard — run analysis from the mission page to generate it."
            action={
              <Link to={missionDetailsPath(mission.id)} className={buttonClasses('primary', 'sm')}>
                Go to Mission
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Executive Report"
        subtitle={mission.title}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Link to={missionDetailsPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              Back to Mission
            </Link>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print / Save as PDF
            </Button>
          </div>
        }
      />
      <p className="mb-4 hidden text-xs text-neutral-400 print:block">Generated {formatDateTime(new Date().toISOString())}</p>

      <ReportBody mission={mission} analysis={analysis} datasets={datasets} />
    </div>
  )
}

interface ReportBodyProps {
  mission: Mission
  analysis: MissionAnalysis
  datasets: ReturnType<typeof useMissionDatasets>
}

/** Mirrors `AnalysisBody` in `pages/MissionReport.tsx` field for field —
 * same derived values, same variable names, same non-memoized style
 * (the dashboard doesn't memoize these either, since they're cheap and
 * only recompute when `analysis`/`datasets` actually change). */
function ReportBody({ mission, analysis, datasets }: ReportBodyProps) {
  const { business_analysis, strategy_analysis, risk_analysis, executive_analysis } = analysis
  // `ExecutiveReport` already confirmed these four are non-null before
  // rendering `ReportBody`, but that narrowing doesn't cross the component
  // boundary — re-checking here (exactly as `AnalysisBody` in
  // `MissionReport.tsx` does) lets TypeScript treat them as non-null for
  // the rest of this function instead of reaching for non-null assertions.
  if (!business_analysis || !strategy_analysis || !risk_analysis || !executive_analysis) {
    return (
      <Card>
        <Banner variant="danger">Analysis is marked completed but results are missing.</Banner>
      </Card>
    )
  }

  const aiConfidence = averageConfidence(analysis)
  const activeDatasets = datasets.status === 'success' ? datasets.data : []
  const datasetQuality = computeDatasetQuality(activeDatasets)
  const hasDatasetProfile = activeDatasets.some((dataset) => dataset.upload_status === 'ready' && dataset.profile)
  const recommendations = topRecommendations(strategy_analysis)
  const risks = topRisks(risk_analysis.critical_risks)

  const evidenceGroups = [
    { label: 'Business', icon: Database, evidenceUsed: business_analysis.evidence_used },
    { label: 'Strategy', icon: Database, evidenceUsed: strategy_analysis.evidence_used },
    { label: 'Risk', icon: Database, evidenceUsed: risk_analysis.evidence_used },
    { label: 'Executive', icon: Database, evidenceUsed: executive_analysis.evidence_used },
  ].filter((agent) => agent.evidenceUsed.length > 0)

  const consensusMetrics = buildConsensusMetrics(analysis, activeDatasets)
  const missionHealthPercent = buildMissionHealthScore(analysis, activeDatasets)
  const deploymentReadinessPct = deploymentReadinessPercent(
    Math.round(executive_analysis.confidence * 100),
    risk_analysis.overall_risk_level
  )
  const pipelineStages = buildPipelineStages(activeDatasets, analysis)
  const agentCards = buildAgentBoardCards(analysis)
  const knowledgeContributions = buildKnowledgeContribution(analysis)
  const conversationEntries = buildAgentConversation(analysis)

  return (
    <div className="flex flex-col gap-4">
      {/* Executive Summary hero */}
      <ReportSection title="Executive Recommendation">
        <ExecutiveRecommendationBanner
          finalRecommendation={executive_analysis.final_recommendation}
          businessDomain={mission.business_domain}
          priority={strategy_analysis.priority}
          aiConfidence={aiConfidence}
        />
      </ReportSection>

      {/* KPI scorecards */}
      <ReportSection title="Executive KPI Overview">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            icon={Activity}
            label="Business Health"
            value={`${Math.round(business_analysis.confidence * 100)}%`}
            badgeLabel={confidenceLabel(business_analysis.confidence)}
            badgeVariant={confidenceBadgeVariant(business_analysis.confidence)}
            caption="Business Agent confidence"
          />
          <KpiCard
            icon={Sparkles}
            label="AI Confidence"
            value={aiConfidence !== null ? `${Math.round(aiConfidence * 100)}%` : '—'}
            badgeLabel={aiConfidence !== null ? confidenceLabel(aiConfidence) : undefined}
            badgeVariant={aiConfidence !== null ? confidenceBadgeVariant(aiConfidence) : undefined}
            caption="Average across all four agents"
          />
          <KpiCard
            icon={HeartPulse}
            label="Mission Health"
            value={missionHealthPercent !== null ? `${missionHealthPercent}%` : '—'}
            caption="Confidence + quality + coverage"
          />
          <KpiCard
            icon={Rocket}
            label="Deployment Readiness"
            value={deploymentReadinessPct !== null ? `${deploymentReadinessPct}%` : '—'}
            caption="Confidence weighed against risk"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Risk Score"
            value={capitalize(risk_analysis.overall_risk_level)}
            badgeLabel={`${risk_analysis.critical_risks.length} risks`}
            badgeVariant={severityBadgeVariant(risk_analysis.overall_risk_level)}
            caption="Overall assessed risk"
          />
          <KpiCard
            icon={Database}
            label="Dataset Quality"
            value={datasetQuality ? `${datasetQuality.scorePercent}%` : '—'}
            badgeLabel={datasetQuality?.label}
            badgeVariant={datasetQuality?.variant}
            caption={datasetQuality ? `${datasetQuality.readyCount}/${datasetQuality.totalCount} datasets validated` : 'No validated datasets'}
          />
        </div>
        <div className="mt-4">
          <ExecutiveScorecard analysis={analysis} />
        </div>
      </ReportSection>

      {/* Executive Analytics charts — the same three groups, in the same
          order, as the Executive Dashboard */}
      <ReportSection title="Business Intelligence" pageBreakBefore>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BusinessImpactWaterfall analysis={analysis} />
          <RiskDistributionChart risk={risk_analysis} />
          <RecommendationCategoryChart analysis={analysis} />
          <ChartCard title="Risk Categories" icon={ShieldAlert} caption="Critical risks grouped by category" available={risk_analysis.critical_risks.length > 0}>
            <RiskCategoryChart risks={risk_analysis.critical_risks} />
          </ChartCard>
        </div>
        <div className="mt-4">
          <TimelineChart mission={mission} datasets={activeDatasets} analysis={analysis} />
        </div>
      </ReportSection>

      <ReportSection title="AI Analytics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AIConfidenceTrend analysis={analysis} />
          <EvidenceCoverageChart analysis={analysis} />
          <AgentContributionChart analysis={analysis} />
          <KnowledgeContributionChart analysis={analysis} />
          <DecisionStrengthGauge decisionStrengthPercent={consensusMetrics.decisionStrengthPercent} />
        </div>
      </ReportSection>

      <ReportSection title="RAG Analytics">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RetrievalAnalyticsChart analysis={analysis} datasets={activeDatasets} />
          <ChartCard title="Dataset Intelligence" icon={Database} caption="Column type composition across all datasets" available={hasDatasetProfile}>
            <DatasetSummaryChart datasets={activeDatasets} />
          </ChartCard>
        </div>
      </ReportSection>

      {/* Business / Strategy / Risk / Executive Analysis — the same
          detail cards used on Mission Details */}
      <ReportSection title="Business Analysis" pageBreakBefore>
        <BusinessAnalysisCard analysis={business_analysis} />
      </ReportSection>

      <ReportSection title="Strategy Analysis">
        <StrategyCard analysis={strategy_analysis} />
      </ReportSection>

      <ReportSection title="Risk Analysis">
        <RiskCard analysis={risk_analysis} />
      </ReportSection>

      <ReportSection title="Executive Analysis">
        <ExecutiveSummaryCard business={business_analysis} strategy={strategy_analysis} risk={risk_analysis} executive={executive_analysis} />
      </ReportSection>

      {evidenceGroups.length > 0 && (
        <ReportSection title="Evidence Used">
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              <Quote className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              Evidence Used
            </h2>
            <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
              Retrieved dataset evidence each agent cited to ground its analysis.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {evidenceGroups.map(({ label, icon: Icon, evidenceUsed }) => (
                <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    <Icon className="h-4 w-4 text-primary-500" aria-hidden="true" />
                    {label} Agent
                  </p>
                  <ul className="flex flex-col gap-2">
                    {evidenceUsed.map((item, index) => (
                      <li key={index} className="border-l-2 border-primary-200 pl-2.5 text-xs text-neutral-600 dark:border-primary-800 dark:text-neutral-400">
                        &ldquo;{item}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        </ReportSection>
      )}

      {/* AI Collaboration */}
      <ReportSection title="AI Collaboration" pageBreakBefore>
        <div className="flex flex-col gap-4">
          <AgentConversationSection entries={conversationEntries} />
          <ConsensusDashboard metrics={consensusMetrics} />
          <KnowledgeContributionSection contributions={knowledgeContributions} />
          <AgentCollaborationBoard cards={agentCards} />
          <EvidenceNetworkSection analysis={analysis} datasets={activeDatasets} />
        </div>
      </ReportSection>

      {/* Explainability */}
      <ReportSection title="Explainability">
        <ExplainabilityPanel analysis={analysis} datasets={activeDatasets} forceExpanded />
      </ReportSection>

      {/* Recommendations — the same Top 5 Recommendations / Top 5 Risks
          cards used on the Executive Dashboard */}
      <ReportSection title="Recommendations" pageBreakBefore>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Top 5 Recommendations</h2>
            <BulletList items={recommendations} />
          </Card>
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Top 5 Risks</h2>
            {risks.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500">None identified.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {risks.map((risk, index) => (
                  <li key={index} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{risk.title}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="neutral">{risk.category}</Badge>
                        <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Probability: {risk.probability}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </ReportSection>

      {/* Timeline / Pipeline */}
      <ReportSection title="Mission Pipeline">
        <LivePipelineSection stages={pipelineStages} />
      </ReportSection>

      <div className="flex items-center justify-center gap-2 pb-8 text-xs text-neutral-400 dark:text-neutral-600 print:hidden">
        <Loader2 className="hidden h-3 w-3" aria-hidden="true" />
        End of report.
      </div>
    </div>
  )
}

export default ExecutiveReport
