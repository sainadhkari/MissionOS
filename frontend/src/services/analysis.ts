import apiClient from './api'
import { downloadBlob, filenameFromContentDisposition } from '../utils/download'
import type { MissionAnalysis, ReportFormat } from '../types/Analysis'

export const analysisService = {
  async start(missionId: string): Promise<MissionAnalysis> {
    const response = await apiClient.post<MissionAnalysis>(`/missions/${missionId}/analyze`)
    return response.data
  },

  async get(missionId: string): Promise<MissionAnalysis> {
    const response = await apiClient.get<MissionAnalysis>(`/missions/${missionId}/analysis`)
    return response.data
  },

  async downloadReport(missionId: string, format: ReportFormat): Promise<void> {
    const response = await apiClient.get<Blob>(`/missions/${missionId}/analysis/report`, {
      params: { format },
      responseType: 'blob',
    })
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'],
      `mission-report.${format}`
    )
    downloadBlob(response.data, filename)
  },
}
