import type { PropsWithChildren } from 'react'

interface FormActionsProps {
  className?: string
}

function FormActions({ children, className = '' }: PropsWithChildren<FormActionsProps>) {
  return <div className={`flex items-center justify-end gap-3 ${className}`}>{children}</div>
}

export default FormActions
