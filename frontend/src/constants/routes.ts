export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/',
  createMission: '/missions/new',
  missionHistory: '/missions/history',
  missionDetails: '/missions/:missionId',
  editMission: '/missions/:missionId/edit',
  missionExecution: '/missions/:missionId/execution',
  missionReport: '/missions/:missionId/report',
  dataLibrary: '/data-library',
  datasetDetails: '/datasets/:datasetId',
  settings: '/settings',
} as const

export function missionDetailsPath(missionId: string): string {
  return `/missions/${missionId}`
}

export function editMissionPath(missionId: string): string {
  return `/missions/${missionId}/edit`
}

export function missionReportPath(missionId: string): string {
  return `/missions/${missionId}/report`
}

export function datasetDetailsPath(datasetId: string): string {
  return `/datasets/${datasetId}`
}
