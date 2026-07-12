import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Database,
  FlaskConical,
  HeartPulse,
  Loader2,
  Network,
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
import { buttonClasses } from '../components/Button'
import ExportReportMenu from '../components/ExportReportMenu'
import ExplainabilityPanel from '../components/Explainability'
import ExecutiveRecommendationBanner from '../components/ExecutiveRecommendationBanner'
import KpiCard from '../components/KpiCard'
import RiskCategoryChart from '../components/RiskCategoryChart'
import DatasetSummaryChart from '../components/DatasetSummaryChart'
import { ChartCard } from '../components/Charts'
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
import { BulletList } from '../components/AnalysisSection'
import { useAnalysisPolling } from '../hooks/useAnalysisPolling'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { ROUTES, aiCollaborationCenterPath, executiveReportPath, missionDetailsPath, scenarioSimulatorPath } from '../constants/routes'
import { severityBadgeVariant } from '../utils/analysis'
import { buildConsensusMetrics } from '../utils/collaborationCenter'
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

function MissionReport() {
  const { missionId } = useParams<{ missionId: string }>()
  const [missionState, setMissionState] = useState<MissionLoadState>({ status: 'loading' })
  const analysisPolling = useAnalysisPolling(missionId)
  const datasets = useMissionDatasets(missionId)

  useEffect(() => {
    if (!missionId) return
    missionService
      .get(missionId)
      .then((mission) => setMissionState({ status: 'success', mission }))
      .catch((err) =>
        setMissionState({ status: 'error', message: getErrorMessage(err, 'Mission not found.') })
      )
  }, [missionId])

  if (missionState.status === 'loading') {
    return (
      <div>
        <PageHeader title="Executive Dashboard" />
        <Loading />
      </div>
    )
  }

  if (missionState.status === 'error') {
    return (
      <div>
        <PageHeader title="Executive Dashboard" />
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

  const { mission } = missionState
  const showExport = analysisPolling.status === 'found' && analysisPolling.analysis.status === 'completed'

  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        subtitle={mission.title}
        actions={
          <>
            <Link to={missionDetailsPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              Back to Mission
            </Link>
            <Link to={aiCollaborationCenterPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <Network className="h-4 w-4" aria-hidden="true" />
              AI Collaboration Center
            </Link>
            <Link to={scenarioSimulatorPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Scenario Simulator
            </Link>
            <Link to={executiveReportPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Executive Report
            </Link>
            {showExport && <ExportReportMenu missionId={mission.id} />}
          </>
        }
      />

      {analysisPolling.status === 'loading' && (
        <Card>
          <Loading />
        </Card>
      )}

      {analysisPolling.status === 'error' && (
        <Card>
          <Banner variant="danger">{analysisPolling.message}</Banner>
        </Card>
      )}

      {analysisPolling.status === 'not_started' && (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No analysis has been run for this mission yet"
            description="Run AI analysis from the mission's page to populate the executive dashboard."
            action={
              <Link to={missionDetailsPath(mission.id)} className={buttonClasses('primary', 'sm')}>
                Go to Mission
              </Link>
            }
          />
        </Card>
      )}

      {analysisPolling.status === 'found' && datasets.status === 'loading' && (
        <Card>
          <Loading />
        </Card>
      )}

      {analysisPolling.status === 'found' && datasets.status !== 'loading' && (
        <AnalysisBody analysis={analysisPolling.analysis} mission={mission} datasets={datasets} />
      )}
    </div>
  )
}

interface AnalysisBodyProps {
  mission: Mission
  analysis: MissionAnalysis
  datasets: ReturnType<typeof useMissionDatasets>
}

function AnalysisBody({ mission, analysis, datasets }: AnalysisBodyProps) {
  if (analysis.status === 'pending' || analysis.status === 'running') {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden="true" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {analysis.status === 'pending'
              ? 'Preparing analysis…'
              : 'Analysis in progress — this can take a minute…'}
          </p>
        </div>
      </Card>
    )
  }

  if (analysis.status === 'failed') {
    return (
      <Card>
        <EmptyState
          icon={AlertTriangle}
          title="Analysis failed"
          description={analysis.error_message ?? 'Something went wrong while running the analysis.'}
          action={
            <Link to={missionDetailsPath(mission.id)} className={buttonClasses('primary', 'sm')}>
              Retry from Mission Page
            </Link>
          }
        />
      </Card>
    )
  }

  const { business_analysis, strategy_analysis, risk_analysis, executive_analysis } = analysis
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

  return (
    <div className="flex flex-col gap-4">
      <ExecutiveRecommendationBanner
        finalRecommendation={executive_analysis.final_recommendation}
        businessDomain={mission.business_domain}
        priority={strategy_analysis.priority}
        aiConfidence={aiConfidence}
      />

      {/* Hero KPI Row */}
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
          caption={
            datasetQuality
              ? `${datasetQuality.readyCount}/${datasetQuality.totalCount} datasets validated`
              : 'No validated datasets'
          }
        />
      </div>

      <ExecutiveScorecard analysis={analysis} />

      {/* Business Intelligence */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Business Intelligence</h2>
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
      </div>

      {/* AI Analytics */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">AI Analytics</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AIConfidenceTrend analysis={analysis} />
          <EvidenceCoverageChart analysis={analysis} />
          <AgentContributionChart analysis={analysis} />
          <KnowledgeContributionChart analysis={analysis} />
          <DecisionStrengthGauge decisionStrengthPercent={consensusMetrics.decisionStrengthPercent} />
        </div>
      </div>

      {/* RAG Analytics */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">RAG Analytics</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RetrievalAnalyticsChart analysis={analysis} datasets={activeDatasets} />
          <ChartCard title="Dataset Intelligence" icon={Database} caption="Column type composition across all datasets" available={hasDatasetProfile}>
            <DatasetSummaryChart datasets={activeDatasets} />
          </ChartCard>
        </div>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Executive Summary</h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{executive_analysis.executive_summary}</p>
      </Card>

      {evidenceGroups.length > 0 && (
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
              <div
                key={label}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40"
              >
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  <Icon className="h-4 w-4 text-primary-500" aria-hidden="true" />
                  {label} Agent
                </p>
                <ul className="flex flex-col gap-2">
                  {evidenceUsed.map((item, index) => (
                    <li
                      key={index}
                      className="border-l-2 border-primary-200 pl-2.5 text-xs text-neutral-600 dark:border-primary-800 dark:text-neutral-400"
                    >
                      &ldquo;{item}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      <ExplainabilityPanel analysis={analysis} datasets={activeDatasets} />
    </div>
  )
}

export default MissionReport
