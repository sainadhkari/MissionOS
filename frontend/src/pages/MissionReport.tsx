import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  Flag,
  Loader2,
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
import KpiCard from '../components/KpiCard'
import OpportunitiesBarChart from '../components/OpportunitiesBarChart'
import RiskCategoryChart from '../components/RiskCategoryChart'
import DatasetSummaryChart from '../components/DatasetSummaryChart'
import { BulletList } from '../components/AnalysisSection'
import { useAnalysisPolling } from '../hooks/useAnalysisPolling'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
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
          <p className="text-sm text-neutral-500">
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

  return (
    <div className="flex flex-col gap-4">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Business Output Breakdown</h2>
          <OpportunitiesBarChart business={business_analysis} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Risk Categories</h2>
          {risk_analysis.critical_risks.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No critical risks identified" />
          ) : (
            <RiskCategoryChart risks={risk_analysis.critical_risks} />
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Dataset Column Types</h2>
          {hasDatasetProfile && datasets.status === 'success' ? (
            <DatasetSummaryChart datasets={datasets.data} />
          ) : (
            <EmptyState icon={Database} title="No dataset profile available" />
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Executive Summary</h2>
        <p className="text-sm text-neutral-700">{executive_analysis.executive_summary}</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Top 5 Recommendations</h2>
          <BulletList items={recommendations} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Top 5 Risks</h2>
          {risks.length === 0 ? (
            <p className="text-sm text-neutral-400">None identified.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {risks.map((risk, index) => (
                <li key={index} className="rounded-md border border-neutral-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-900">{risk.title}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="neutral">{risk.category}</Badge>
                      <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-500">Probability: {risk.probability}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

export default MissionReport
