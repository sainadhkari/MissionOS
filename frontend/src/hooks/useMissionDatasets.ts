import { useCallback, useEffect, useState } from 'react'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import type { Dataset } from '../types/Dataset'

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

  const refetch = useCallback(() => {
    setState({ status: 'loading' })
    load()
  }, [load])

  return { ...state, refetch }
}
