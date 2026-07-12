import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ROUTES } from './constants/routes'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './components/ProtectedRoute'
import Loading from './components/Loading'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateMission = lazy(() => import('./pages/CreateMission'))
const MissionHistory = lazy(() => import('./pages/MissionHistory'))
const MissionDetails = lazy(() => import('./pages/MissionDetails'))
const EditMission = lazy(() => import('./pages/EditMission'))
const DatasetDetails = lazy(() => import('./pages/DatasetDetails'))
const MissionReport = lazy(() => import('./pages/MissionReport'))
const DataLibrary = lazy(() => import('./pages/DataLibrary'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/404'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path={ROUTES.landing} element={<Landing />} />
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="missions/new" element={<CreateMission />} />
          <Route path="missions/history" element={<MissionHistory />} />
          <Route path="missions/:missionId/edit" element={<EditMission />} />
          <Route path="missions/:missionId" element={<MissionDetails />} />
          <Route path="missions/:missionId/report" element={<MissionReport />} />
          <Route path="datasets/:datasetId" element={<DatasetDetails />} />
          <Route path="data-library" element={<DataLibrary />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
