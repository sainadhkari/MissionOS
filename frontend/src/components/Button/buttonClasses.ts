export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md focus-visible:outline-primary-600',
  secondary:
    'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus-visible:outline-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
  outline:
    'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus-visible:outline-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 focus-visible:outline-neutral-400 dark:text-neutral-400 dark:hover:bg-neutral-800',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700 hover:shadow-md focus-visible:outline-danger-600',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-sm',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`
}
