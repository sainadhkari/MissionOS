import { useCallback, useEffect, useState } from 'react'
import { datasetService } from '../services/dataset'
import { getErrorMessage } from '../utils/http'
import type { Dataset } from '../types/Dataset'
import type { Mission } from '../types/Mission'

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

  const refetch = useCallback(() => {
    if (!missions) return
    setState({ status: 'loading' })
    load(missions)
  }, [missions, load])

  return { ...state, refetch }
}
