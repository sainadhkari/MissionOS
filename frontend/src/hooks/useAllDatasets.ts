import { useCallback, useEffect, useState } from 'react'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import { NON_TERMINAL_DATASET_STATUSES, NON_TERMINAL_RAG_INDEX_STATUSES } from '../types/Dataset'
import type { Dataset } from '../types/Dataset'
import type { Mission } from '../types/Mission'

const POLL_INTERVAL_MS = 2500

export interface DatasetWithMission extends Dataset {
  missionTitle: string
}

type AllDatasetsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: DatasetWithMission[] }

/** Aggregates datasets across every given mission (the API only exposes
 * datasets per-mission, so this fans out one request per mission). */
export function useAllDatasets(missions: Mission[] | null) {
  const [state, setState] = useState<AllDatasetsState>({ status: 'loading' })

  const load = useCallback((missionList: Mission[]) => {
    Promise.all(
      missionList.map((mission) =>
        datasetService
          .listForMission(mission.id)
          .then((datasets) => datasets.map((dataset) => ({ ...dataset, missionTitle: mission.title })))
      )
    )
      .then((perMission) => {
        const combined = perMission.flat().sort((a, b) => b.created_at.localeCompare(a.created_at))
        setState({ status: 'success', data: combined })
      })
      .catch((err) => setState({ status: 'error', message: getErrorMessage(err, 'Could not load datasets.') }))
  }, [])

  useEffect(() => {
    if (!missions) return
    load(missions)
  }, [missions, load])

  // Poll while any dataset is still being validated or RAG-indexed, so
  // status badges and vector counts update without a manual refresh.
  useEffect(() => {
    if (state.status !== 'success' || !missions) return
    const hasPending = state.data.some(
      (dataset) =>
        NON_TERMINAL_DATASET_STATUSES.includes(dataset.upload_status) ||
        (dataset.index && NON_TERMINAL_RAG_INDEX_STATUSES.includes(dataset.index.status))
    )
    if (!hasPending) return

    const timeout = setTimeout(() => load(missions), POLL_INTERVAL_MS)
    return () => clearTimeout(timeout)
  }, [state, missions, load])

  const refetch = useCallback(() => {
    if (!missions) return
    setState({ status: 'loading' })
    load(missions)
  }, [missions, load])

  return { ...state, refetch }
}
