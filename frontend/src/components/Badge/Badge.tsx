import type { PropsWithChildren } from 'react'

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300',
  success: 'bg-success-50 text-success-700 dark:bg-success-950/60 dark:text-success-300',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-950/60 dark:text-warning-300',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-950/60 dark:text-danger-300',
  info: 'bg-info-50 text-info-700 dark:bg-info-950/60 dark:text-info-300',
}

function Badge({ variant = 'neutral', className = '', children }: PropsWithChildren<BadgeProps>) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
