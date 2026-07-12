import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { analysisService } from '../services/analysis'
import type { Mission } from '../types/Mission'
import type { MissionAnalysis } from '../types/Analysis'

type MissionAnalysesState =
  | { status: 'loading' }
  | { status: 'success'; data: Map<string, MissionAnalysis> }

/** Fetches each mission's analysis in parallel so summary views (e.g. Mission
 * History cards) can show confidence/risk without a per-card fetch. Missions
 * with no analysis yet (404) are simply absent from the returned map. */
export function useMissionAnalyses(missions: Mission[] | null) {
  const [state, setState] = useState<MissionAnalysesState>({ status: 'loading' })

  const load = useCallback((missionList: Mission[]) => {
    Promise.all(
      missionList.map((mission) =>
        analysisService
          .get(mission.id)
          .then((analysis): [string, MissionAnalysis] | null => [mission.id, analysis])
          .catch((err) => {
            if (axios.isAxiosError(err) && err.response?.status === 404) return null
            return null
          })
      )
    ).then((entries) => {
      const data = new Map(entries.filter((entry): entry is [string, MissionAnalysis] => entry !== null))
      setState({ status: 'success', data })
    })
  }, [])

  useEffect(() => {
    if (!missions) return
    load(missions)
  }, [missions, load])

  return state
}
