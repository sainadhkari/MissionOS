import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Database,
  Flag,
  Loader2,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import { buttonClasses } from '../components/Button'
import ExportReportMenu from '../components/ExportReportMenu'
import KpiCard from '../components/KpiCard'
import ConfidenceGauge from '../components/ConfidenceGauge'
import OpportunitiesBarChart from '../components/OpportunitiesBarChart'
import RiskCategoryChart from '../components/RiskCategoryChart'
import DatasetSummaryChart from '../components/DatasetSummaryChart'
import { BulletList } from '../components/AnalysisSection'
import { useAnalysisPolling } from '../hooks/useAnalysisPolling'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { formatDate } from '../utils/date'
import { ROUTES, missionDetailsPath } from '../constants/routes'
import { severityBadgeVariant } from '../utils/analysis'
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

      {analysisPolling.status === 'found' && (
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
  const datasetQuality = datasets.status === 'success' ? computeDatasetQuality(datasets.data) : null
  const hasDatasetProfile =
    datasets.status === 'success' && datasets.data.some((dataset) => dataset.upload_status === 'ready' && dataset.profile)
  const recommendations = topRecommendations(strategy_analysis)
  const risks = topRisks(risk_analysis.critical_risks)

  const agents = [
    { label: 'Business Analyst', icon: Briefcase, confidence: business_analysis.confidence },
    { label: 'Strategy', icon: Target, confidence: strategy_analysis.confidence },
    { label: 'Risk', icon: ShieldAlert, confidence: risk_analysis.confidence },
    { label: 'Executive', icon: Sparkles, confidence: executive_analysis.confidence },
  ]

  const timeline = [
    { label: 'Mission Created', timestamp: mission.created_at },
    { label: 'Analysis Started', timestamp: analysis.started_at },
    { label: 'Analysis Completed', timestamp: analysis.completed_at },
  ].filter((entry): entry is { label: string; timestamp: string } => Boolean(entry.timestamp))

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-violet-700 p-6 text-white shadow-glow sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Analysis Completed
            </span>
            <h2 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">{executive_analysis.final_recommendation}</h2>
            <p className="mt-2 text-sm text-white/70">{mission.business_domain} · Priority: {capitalize(strategy_analysis.priority)}</p>
          </div>
          {aiConfidence !== null && (
            <div className="shrink-0 rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <ConfidenceGaugeLight value={aiConfidence} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={Activity}
          label="Business Health"
          value={`${Math.round(business_analysis.confidence * 100)}%`}
          badgeLabel={confidenceLabel(business_analysis.confidence)}
          badgeVariant={confidenceBadgeVariant(business_analysis.confidence)}
          caption="Business analysis confidence"
        />
        <KpiCard
          icon={Sparkles}
          label="AI Confidence"
          value={aiConfidence !== null ? `${Math.round(aiConfidence * 100)}%` : '—'}
          badgeLabel={aiConfidence !== null ? confidenceLabel(aiConfidence) : undefined}
          badgeVariant={aiConfidence !== null ? confidenceBadgeVariant(aiConfidence) : undefined}
          caption="Average across all four analyses"
        />
        <KpiCard
          icon={ShieldAlert}
          label="Risk Level"
          value={capitalize(risk_analysis.overall_risk_level)}
          badgeLabel={`${risk_analysis.critical_risks.length} risks`}
          badgeVariant={severityBadgeVariant(risk_analysis.overall_risk_level)}
          caption="Overall assessed risk"
        />
        <KpiCard
          icon={Flag}
          label="Priority"
          value={capitalize(strategy_analysis.priority)}
          badgeLabel={capitalize(strategy_analysis.priority)}
          badgeVariant={severityBadgeVariant(strategy_analysis.priority)}
          caption="Recommended strategic priority"
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="flex items-center justify-center">
          {aiConfidence !== null ? (
            <ConfidenceGauge value={aiConfidence} />
          ) : (
            <EmptyState icon={Sparkles} title="No confidence score yet" />
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Agent Status</h2>
          <div className="flex flex-col gap-3">
            {agents.map(({ label, icon: Icon, confidence }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Icon className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={confidenceBadgeVariant(confidence)}>{Math.round(confidence * 100)}%</Badge>
                  <Badge variant="success">Complete</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mission Timeline</h2>
          <ol className="flex flex-col gap-4">
            {timeline.map((entry, index) => (
              <li key={entry.label} className="flex items-start gap-3">
                <span className="flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {index < timeline.length - 1 && <span className="mt-1 h-6 w-px bg-neutral-200 dark:bg-neutral-800" />}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{entry.label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(entry.timestamp)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Business Impact</h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{strategy_analysis.business_impact}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Business Output Breakdown</h2>
          <OpportunitiesBarChart business={business_analysis} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Risk Categories</h2>
          {risk_analysis.critical_risks.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No critical risks identified" />
          ) : (
            <RiskCategoryChart risks={risk_analysis.critical_risks} />
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Dataset Column Types</h2>
          {hasDatasetProfile && datasets.status === 'success' ? (
            <DatasetSummaryChart datasets={datasets.data} />
          ) : (
            <EmptyState icon={Database} title="No dataset profile available" />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Executive Summary</h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{executive_analysis.executive_summary}</p>
      </Card>

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
    </div>
  )
}

/** A compact confidence readout for the hero banner, tuned for a colored
 * gradient background rather than the card surface `ConfidenceGauge` targets. */
function ConfidenceGaugeLight({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <span className="text-4xl font-bold text-white">{Math.round(value * 100)}%</span>
      <span className="text-xs font-medium text-white/70">AI Confidence</span>
    </div>
  )
}

export default MissionReport
