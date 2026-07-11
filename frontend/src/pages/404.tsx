import { Link } from 'react-router-dom'
import { ROUTES } from '../constants/routes'

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50">
      <h1 className="text-xl font-semibold text-slate-900">404 — Page not found</h1>
      <Link to={ROUTES.dashboard} className="text-sm text-slate-500 hover:text-slate-900">
        Back to Dashboard
      </Link>
    </div>
  )
}

export default NotFound
