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
      // PDF rendering runs xhtml2pdf's full page-layout engine over a
      // multi-page report (charts, tables, dozens of cards) and has been
      // observed taking 5-6+ seconds — well past the client's default 5s
      // timeout (services/api.ts). That's a client-side abort, not a
      // backend failure: the export was still succeeding server-side the
      // whole time, the response just never made it back before axios
      // gave up. HTML export (no layout engine, plain string templating)
      // stays comfortably under a second either way.
      timeout: 60000,
    })
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'],
      `mission-report.${format}`
    )
    downloadBlob(response.data, filename)
  },
}
