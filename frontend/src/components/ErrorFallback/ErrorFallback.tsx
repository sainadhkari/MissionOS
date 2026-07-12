import { AlertTriangle } from 'lucide-react'
import Card from '../Card'
import Button from '../Button'

interface ErrorFallbackProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

function ErrorFallback({ title, description, actionLabel, onAction }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <Card className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-950/60 dark:text-danger-400">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        {onAction && actionLabel && (
          <Button variant="primary" size="sm" className="mt-5" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Card>
    </div>
  )
}

export default ErrorFallback
