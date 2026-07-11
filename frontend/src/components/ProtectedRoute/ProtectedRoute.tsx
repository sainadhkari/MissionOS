import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../../services/auth'
import { ROUTES } from '../../constants/routes'

function ProtectedRoute({ children }: PropsWithChildren) {
  if (!authService.isAuthenticated()) {
    return <Navigate to={ROUTES.login} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
