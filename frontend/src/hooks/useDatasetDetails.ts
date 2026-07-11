import { useCallback, useEffect, useState } from 'react'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import { NON_TERMINAL_DATASET_STATUSES } from '../types/Dataset'
import type { Dataset } from '../types/Dataset'

const POLL_INTERVAL_MS = 2000

type DatasetDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Dataset }

export function useDatasetDetails(datasetId: string | undefined) {
  const [state, setState] = useState<DatasetDetailState>({ status: 'loading' })

  const load = useCallback(() => {
    if (!datasetId) return
    datasetService
      .get(datasetId)
      .then((data) => setState({ status: 'success', data }))
      .catch((err) =>
        setState({ status: 'error', message: getErrorMessage(err, 'Dataset not found.') })
      )
  }, [datasetId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (state.status !== 'success') return
    if (!NON_TERMINAL_DATASET_STATUSES.includes(state.data.upload_status)) return

    const timeout = setTimeout(load, POLL_INTERVAL_MS)
    return () => clearTimeout(timeout)
  }, [state, load])

  return state
}
