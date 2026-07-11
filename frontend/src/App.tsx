import { Route, Routes } from 'react-router-dom'
import { ROUTES } from './constants/routes'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateMission from './pages/CreateMission'
import MissionHistory from './pages/MissionHistory'
import MissionDetails from './pages/MissionDetails'
import EditMission from './pages/EditMission'
import MissionExecution from './pages/MissionExecution'
import MissionReport from './pages/MissionReport'
import DataLibrary from './pages/DataLibrary'
import Settings from './pages/Settings'
import NotFound from './pages/404'

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.register} element={<Register />} />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="missions/new" element={<CreateMission />} />
        <Route path="missions/history" element={<MissionHistory />} />
        <Route path="missions/:missionId/edit" element={<EditMission />} />
        <Route path="missions/:missionId" element={<MissionDetails />} />
        <Route path="missions/:missionId/execution" element={<MissionExecution />} />
        <Route path="missions/:missionId/report" element={<MissionReport />} />
        <Route path="data-library" element={<DataLibrary />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
