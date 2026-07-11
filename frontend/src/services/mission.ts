import apiClient from './api'
import type { Mission, MissionFormValues } from '../types/Mission'

function toCreatePayload(values: MissionFormValues) {
  return {
    title: values.title,
    business_domain: values.businessDomain,
    priority: values.priority,
    problem_statement: values.problemStatement,
    objective: values.objective,
    expected_output: values.expectedOutput,
  }
}

function toUpdatePayload(values: MissionFormValues) {
  return { ...toCreatePayload(values), status: values.status }
}

export const missionService = {
  async list(): Promise<Mission[]> {
    const response = await apiClient.get<Mission[]>('/missions')
    return response.data
  },

  async get(missionId: string): Promise<Mission> {
    const response = await apiClient.get<Mission>(`/missions/${missionId}`)
    return response.data
  },

  async create(values: MissionFormValues): Promise<Mission> {
    const response = await apiClient.post<Mission>('/missions', toCreatePayload(values))
    return response.data
  },

  async update(missionId: string, values: MissionFormValues): Promise<Mission> {
    const response = await apiClient.put<Mission>(`/missions/${missionId}`, toUpdatePayload(values))
    return response.data
  },

  async remove(missionId: string): Promise<void> {
    await apiClient.delete(`/missions/${missionId}`)
  },
}
