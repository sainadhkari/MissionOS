import apiClient from './api'
import type { HealthStatus } from '../types/Api'

export const healthService = {
  check(): Promise<HealthStatus> {
    return apiClient.get<HealthStatus>('/health').then((response) => response.data)
  },
}
