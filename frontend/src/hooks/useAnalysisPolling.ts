import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { analysisService } from '../services/analysis'
import { getErrorMessage } from '../utils/http'
import { NON_TERMINAL_ANALYSIS_STATUSES } from '../types/Analysis'
import type { MissionAnalysis } from '../types/Analysis'

const POLL_INTERVAL_MS = 3000

type AnalysisPollingState =
  | { status: 'loading' }
  | { status: 'not_started' }
  | { status: 'found'; analysis: MissionAnalysis }
  | { status: 'error'; message: string }

/** Fetches a mission's current analysis, and polls it automatically while
 * pending/running — stopping the moment it reaches a terminal status, since
 * the polling effect simply won't reschedule itself past that point.
 * Also exposes `start`/`retry` (the same POST call under two names, per the
 * ticket: "Retry Analysis" reuses the same endpoint as "Analyze Mission"). */
export function useAnalysisPolling(missionId: string | undefined) {
  const [state, setState] = useState<AnalysisPollingState>({ status: 'loading' })
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!missionId) return
    analysisService
      .get(missionId)
      .then((analysis) => setState({ status: 'found', analysis }))
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setState({ status: 'not_started' })
        } else {
          setState({
            status: 'error',
            message: getErrorMessage(err, 'Could not load analysis status.'),
          })
        }
      })
  }, [missionId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (state.status !== 'found') return
    if (!NON_TERMINAL_ANALYSIS_STATUSES.includes(state.analysis.status)) return

    const timeout = setTimeout(load, POLL_INTERVAL_MS)
    return () => clearTimeout(timeout)
  }, [state, load])

  const start = useCallback(async () => {
    if (!missionId) return
    setStartError(null)
    setIsStarting(true)
    try {
      const analysis = await analysisService.start(missionId)
      setState({ status: 'found', analysis })
    } catch (err) {
      setStartError(getErrorMessage(err, 'Could not start analysis.'))
    } finally {
      setIsStarting(false)
    }
  }, [missionId])

  return { ...state, start, retry: start, isStarting, startError }
}
