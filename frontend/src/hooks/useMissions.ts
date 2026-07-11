import { useCallback, useEffect, useState } from 'react'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import type { Mission } from '../types/Mission'

type MissionsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Mission[] }

export function useMissions() {
  const [state, setState] = useState<MissionsState>({ status: 'loading' })

  const load = useCallback(() => {
    missionService
      .list()
      .then((data) => setState({ status: 'success', data }))
      .catch((err) =>
        setState({ status: 'error', message: getErrorMessage(err, 'Could not load missions.') })
      )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refetch = useCallback(() => {
    setState({ status: 'loading' })
    load()
  }, [load])

  return { ...state, refetch }
}
