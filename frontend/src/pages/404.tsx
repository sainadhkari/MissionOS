import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Card from '../components/Card'
import { buttonClasses } from '../components/Button'
import { ROUTES } from '../constants/routes'

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <Card className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-base font-semibold text-neutral-900">Page not found</h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link to={ROUTES.dashboard} className={`${buttonClasses('primary', 'sm')} mt-5`}>
          Back to Dashboard
        </Link>
      </Card>
    </div>
  )
}

export default NotFound
