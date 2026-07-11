import { useEffect, useState } from 'react'
import { healthService } from '../services/health'

type HealthCheckStatus = 'loading' | 'online' | 'offline'

export function useHealthCheck(): HealthCheckStatus {
  const [status, setStatus] = useState<HealthCheckStatus>('loading')

  useEffect(() => {
    let cancelled = false

    healthService
      .check()
      .then(() => {
        if (!cancelled) setStatus('online')
      })
      .catch(() => {
        if (!cancelled) setStatus('offline')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return status
}
