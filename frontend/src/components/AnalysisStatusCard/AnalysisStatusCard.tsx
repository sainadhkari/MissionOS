import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import Card from '../Card'
import Badge from '../Badge'
import Button from '../Button'
import Banner from '../Banner'
import { formatDate } from '../../utils/date'
import { analysisStatusBadgeVariant, analysisStatusLabel, RUNNING_STAGE_MESSAGES } from '../../utils/analysis'
import type { AnalysisViewStatus, MissionAnalysis } from '../../types/Analysis'

interface AnalysisStatusCardProps {
  viewStatus: AnalysisViewStatus
  analysis: MissionAnalysis | null
  onStart: () => void
  isStarting: boolean
  startError: string | null
}

function useRotatingMessage(active: boolean): string {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!active) return

    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % RUNNING_STAGE_MESSAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [active])

  return RUNNING_STAGE_MESSAGES[index]
}

function AnalysisStatusCard({
  viewStatus,
  analysis,
  onStart,
  isStarting,
  startError,
}: AnalysisStatusCardProps) {
  const runningMessage = useRotatingMessage(viewStatus === 'running')

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">AI Analysis</h2>
        <Badge variant={analysisStatusBadgeVariant(viewStatus)}>
          {analysisStatusLabel(viewStatus)}
        </Badge>
      </div>

      {startError && (
        <Banner variant="danger" className="mt-4">
          {startError}
        </Banner>
      )}

      {viewStatus === 'not_started' && (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm text-neutral-500">
            Run Business, Strategy, Risk, and Executive analysis for this mission using its
            validated datasets.
          </p>
          <Button variant="primary" size="sm" onClick={onStart} disabled={isStarting}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {isStarting ? 'Starting…' : 'Analyze Mission'}
          </Button>
        </div>
      )}

      {viewStatus === 'pending' && (
        <div className="mt-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden="true" />
          <p className="text-sm text-neutral-500">Preparing analysis…</p>
        </div>
      )}

      {viewStatus === 'running' && (
        <div className="mt-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden="true" />
          <p className="text-sm text-neutral-500">{runningMessage}</p>
        </div>
      )}

      {viewStatus === 'failed' && (
        <div className="mt-4 flex flex-col items-start gap-3">
          {analysis?.error_message && (
            <Banner variant="danger" className="w-full">
              {analysis.error_message}
            </Banner>
          )}
          <Button variant="primary" size="sm" onClick={onStart} disabled={isStarting}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {isStarting ? 'Retrying…' : 'Retry Analysis'}
          </Button>
        </div>
      )}

      {viewStatus === 'completed' && analysis?.completed_at && (
        <p className="mt-4 text-sm text-neutral-500">
          Completed {formatDate(analysis.completed_at)}. See the sections below for full results.
        </p>
      )}
    </Card>
  )
}

export default AnalysisStatusCard
