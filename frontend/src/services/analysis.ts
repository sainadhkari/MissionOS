import apiClient from './api'
import type { MissionAnalysis } from '../types/Analysis'

export const analysisService = {
  async start(missionId: string): Promise<MissionAnalysis> {
    const response = await apiClient.post<MissionAnalysis>(`/missions/${missionId}/analyze`)
    return response.data
  },

  async get(missionId: string): Promise<MissionAnalysis> {
    const response = await apiClient.get<MissionAnalysis>(`/missions/${missionId}/analysis`)
    return response.data
  },
}
