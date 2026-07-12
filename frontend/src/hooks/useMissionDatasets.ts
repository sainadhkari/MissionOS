import { useCallback, useEffect, useState } from 'react'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import { NON_TERMINAL_DATASET_STATUSES, NON_TERMINAL_RAG_INDEX_STATUSES } from '../types/Dataset'
import type { Dataset } from '../types/Dataset'

const POLL_INTERVAL_MS = 2000

type DatasetsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Dataset[] }

export function useMissionDatasets(missionId: string | undefined) {
  const [state, setState] = useState<DatasetsState>({ status: 'loading' })

  const load = useCallback(() => {
    if (!missionId) return
    datasetService
      .listForMission(missionId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err) =>
        setState({ status: 'error', message: getErrorMessage(err, 'Could not load datasets.') })
      )
  }, [missionId])

  useEffect(() => {
    load()
  }, [load])

  // Poll while any dataset is still being validated or RAG-indexed, so
  // status badges update without a manual refresh. Indexing runs chained
  // after validation succeeds, so a dataset can be READY while still
  // showing index.status as pending/indexing.
  useEffect(() => {
    if (state.status !== 'success') return
    const hasPending = state.data.some(
      (dataset) =>
        NON_TERMINAL_DATASET_STATUSES.includes(dataset.upload_status) ||
        (dataset.index && NON_TERMINAL_RAG_INDEX_STATUSES.includes(dataset.index.status))
    )
    if (!hasPending) return

    const timeout = setTimeout(load, POLL_INTERVAL_MS)
    return () => clearTimeout(timeout)
  }, [state, load])

  const refetch = useCallback(() => {
    setState({ status: 'loading' })
    load()
  }, [load])

  return { ...state, refetch }
}
