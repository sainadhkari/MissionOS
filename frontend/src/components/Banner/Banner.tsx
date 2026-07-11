import type { PropsWithChildren } from 'react'

type BannerVariant = 'success' | 'danger'

interface BannerProps {
  variant: BannerVariant
  className?: string
}

const variantClasses: Record<BannerVariant, string> = {
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
}

function Banner({ variant, className = '', children }: PropsWithChildren<BannerProps>) {
  return (
    <p className={`rounded-md px-3 py-2 text-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </p>
  )
}

export default Banner
