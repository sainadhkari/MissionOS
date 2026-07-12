import type { PropsWithChildren } from 'react'

interface CardProps {
  className?: string
}

function Card({ children, className = '' }: PropsWithChildren<CardProps>) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-6 shadow-card transition-colors dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {children}
    </div>
  )
}

export default Card
