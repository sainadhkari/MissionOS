import { useCallback, useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { getErrorMessage } from '../utils/http'
import type { User } from '../types/User'

type CurrentUserState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: User }

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>({ status: 'loading' })

  const load = useCallback(() => {
    authService
      .getCurrentUser()
      .then((data) => setState({ status: 'success', data }))
      .catch((err) => setState({ status: 'error', message: getErrorMessage(err, 'Could not load profile.') }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return state
}
