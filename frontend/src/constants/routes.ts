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
  settings: '/settings',
} as const

export function missionDetailsPath(missionId: string): string {
  return `/missions/${missionId}`
}

export function editMissionPath(missionId: string): string {
  return `/missions/${missionId}/edit`
}
