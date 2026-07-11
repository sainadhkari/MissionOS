export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/',
  createMission: '/missions/new',
  missionHistory: '/missions/history',
  missionExecution: '/missions/:missionId/execution',
  missionReport: '/missions/:missionId/report',
  dataLibrary: '/data-library',
  settings: '/settings',
} as const
