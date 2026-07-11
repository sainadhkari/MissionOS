import apiClient from './api'
import type { Dataset } from '../types/Dataset'

export const datasetService = {
  async listForMission(missionId: string): Promise<Dataset[]> {
    const response = await apiClient.get<Dataset[]>(`/missions/${missionId}/datasets`)
    return response.data
  },

  async get(datasetId: string): Promise<Dataset> {
    const response = await apiClient.get<Dataset>(`/datasets/${datasetId}`)
    return response.data
  },

  async upload(
    missionId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<Dataset> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<Dataset>(`/missions/${missionId}/datasets`, formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    })
    return response.data
  },

  async remove(datasetId: string): Promise<void> {
    await apiClient.delete(`/datasets/${datasetId}`)
  },
}
