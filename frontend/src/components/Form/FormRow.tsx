import type { PropsWithChildren } from 'react'

interface FormRowProps {
  className?: string
}

function FormRow({ children, className = '' }: PropsWithChildren<FormRowProps>) {
  return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}>{children}</div>
}

export default FormRow
