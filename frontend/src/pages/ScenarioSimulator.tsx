import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Gauge as GaugeIcon,
  HeartPulse,
  Rocket,
  ShieldAlert,
  Sparkles,
  TestTube2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import { buttonClasses } from '../components/Button'
import {
  ScenarioControlsPanel,
  ScenarioMetricCard,
  RevenueProjectionCard,
  ScenarioCompareTable,
  RecommendationChangesList,
  ScenarioSummaryCard,
  SavedScenariosPanel,
} from '../components/ScenarioSimulator'
import { useAnalysisPolling } from '../hooks/useAnalysisPolling'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { useSavedScenarios } from '../hooks/useSavedScenarios'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { ROUTES, missionDetailsPath } from '../constants/routes'
import { DEFAULT_SCENARIO_PARAMETERS } from '../types/Scenario'
import {
  buildRecommendationChanges,
  buildScenarioSummary,
  computeScenarioBaseline,
  computeScenarioProjection,
} from '../utils/scenarioSimulation'
import type { ScenarioParameterKey, ScenarioParameters } from '../types/Scenario'
import type { Mission } from '../types/Mission'

type MissionLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; mission: Mission }

function ScenarioSimulator() {
  const { missionId } = useParams<{ missionId: string }>()
  const [missionState, setMissionState] = useState<MissionLoadState>({ status: 'loading' })
  const analysisPolling = useAnalysisPolling(missionId)
  const datasets = useMissionDatasets(missionId)
  const savedScenarios = useSavedScenarios(missionId)

  const [parameters, setParameters] = useState<ScenarioParameters>(DEFAULT_SCENARIO_PARAMETERS)
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])

  useEffect(() => {
    if (!missionId) return
    missionService
      .get(missionId)
      .then((mission) => setMissionState({ status: 'success', mission }))
      .catch((err) => setMissionState({ status: 'error', message: getErrorMessage(err, 'Mission not found.') }))
  }, [missionId])

  function handleParameterChange(key: ScenarioParameterKey, value: number) {
    setParameters((prev) => ({ ...prev, [key]: value }))
  }

  function handleResetAll() {
    setParameters(DEFAULT_SCENARIO_PARAMETERS)
  }

  function toggleScenarioSelection(id: string) {
    setSelectedScenarioIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]))
  }

  const analysis = analysisPolling.status === 'found' ? analysisPolling.analysis : null
  const isAnalysisReady =
    analysis?.status === 'completed' &&
    analysis.business_analysis &&
    analysis.strategy_analysis &&
    analysis.risk_analysis &&
    analysis.executive_analysis

  const baseline = useMemo(() => {
    const activeDatasets = datasets.status === 'success' ? datasets.data : []
    return computeScenarioBaseline(analysis, activeDatasets)
  }, [analysis, datasets])
  const projection = useMemo(() => computeScenarioProjection(baseline, parameters), [baseline, parameters])
  const recommendationChanges = useMemo(() => buildRecommendationChanges(analysis, parameters), [analysis, parameters])
  const summary = useMemo(() => buildScenarioSummary(parameters, projection), [parameters, projection])

  const selectedScenarios = savedScenarios.scenarios.filter((s) => selectedScenarioIds.includes(s.id))
  const compareColumns = useMemo(() => {
    if (selectedScenarios.length >= 2) {
      return selectedScenarios.map((scenario) => ({
        label: scenario.name,
        projection: computeScenarioProjection(baseline, scenario.parameters),
        recommendationChanges: buildRecommendationChanges(analysis, scenario.parameters),
      }))
    }
    return [{ label: 'Scenario', projection, recommendationChanges }]
  }, [selectedScenarios, baseline, projection, recommendationChanges, analysis])

  if (missionState.status === 'loading' || analysisPolling.status === 'loading' || datasets.status === 'loading') {
    return (
      <div>
        <PageHeader title="Scenario Simulator" />
        <Loading />
      </div>
    )
  }

  if (missionState.status === 'error') {
    return (
      <div>
        <PageHeader title="Scenario Simulator" />
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
        <PageHeader title="Scenario Simulator" />
        <Card>
          <Banner variant="danger">{analysisPolling.message}</Banner>
        </Card>
      </div>
    )
  }

  const { mission } = missionState

  if (!isAnalysisReady) {
    return (
      <div>
        <PageHeader
          title="Scenario Simulator"
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
            description="The Scenario Simulator projects what-if outcomes from this mission's existing analysis — run analysis from the mission page to unlock it."
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
        title="Scenario Simulator"
        subtitle={mission.title}
        actions={
          <Link to={missionDetailsPath(mission.id)} className={buttonClasses('outline', 'sm')}>
            Back to Mission
          </Link>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-md bg-info-50 px-3 py-2 text-sm text-info-700 dark:bg-info-950/50 dark:text-info-300">
        <TestTube2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Every result on this page is a <strong>Scenario Projection</strong> — a deterministic what-if simulation derived from
          this mission's existing analysis, dataset statistics, and recommendations. No new AI analysis is run and nothing here
          is an actual prediction.
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <ScenarioControlsPanel parameters={parameters} onChange={handleParameterChange} onResetAll={handleResetAll} />

        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Scenario Projections</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScenarioMetricCard
              title="Business Impact Projection"
              icon={Activity}
              caption="Composite of the parameters that drive business outcomes"
              baselineValue={50}
              projectedValue={projection.businessImpactPercent}
              delta={projection.businessImpactDelta}
            />
            <RevenueProjectionCard revenueIndex={projection.revenueIndex} revenueIndexDelta={projection.revenueIndexDelta} />
            <ScenarioMetricCard
              title="Risk Projection"
              icon={ShieldAlert}
              caption="Projected overall risk level"
              baselineValue={baseline.riskPercent}
              projectedValue={projection.riskPercent}
              delta={projection.riskDelta}
              inverted
            />
            <ScenarioMetricCard
              title="Confidence Projection"
              icon={Sparkles}
              caption="Projected AI confidence"
              baselineValue={baseline.confidencePercent}
              projectedValue={projection.confidencePercent}
              delta={projection.confidenceDelta}
            />
            <ScenarioMetricCard
              title="Decision Readiness"
              icon={GaugeIcon}
              caption={projection.decisionReadinessLabel}
              baselineValue={baseline.deploymentReadinessPercent}
              projectedValue={projection.deploymentReadinessPercent}
              delta={projection.deploymentReadinessDelta}
            />
            <ScenarioMetricCard
              title="Mission Health Projection"
              icon={HeartPulse}
              caption="Confidence + dataset quality + evidence coverage"
              baselineValue={baseline.missionHealthPercent}
              projectedValue={projection.missionHealthPercent}
              delta={projection.missionHealthDelta}
            />
            <ScenarioMetricCard
              title="Business Readiness Projection"
              icon={Rocket}
              caption="Dataset quality + evidence coverage"
              baselineValue={baseline.businessReadinessPercent}
              projectedValue={projection.businessReadinessPercent}
              delta={0}
              unaffected
            />
          </div>
        </div>

        <RecommendationChangesList changes={recommendationChanges} />

        <ScenarioSummaryCard summary={summary} />

        <ScenarioCompareTable baseline={baseline} columns={compareColumns} />

        <SavedScenariosPanel
          scenarios={savedScenarios.scenarios}
          currentParameters={parameters}
          onCreate={savedScenarios.create}
          onRename={savedScenarios.rename}
          onDuplicate={savedScenarios.duplicate}
          onDelete={(id) => {
            savedScenarios.remove(id)
            setSelectedScenarioIds((prev) => prev.filter((existing) => existing !== id))
          }}
          onLoad={setParameters}
          selectedIds={selectedScenarioIds}
          onToggleSelect={toggleScenarioSelection}
        />
      </div>
    </div>
  )
}

export default ScenarioSimulator
