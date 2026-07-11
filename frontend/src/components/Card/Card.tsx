import type { PropsWithChildren } from 'react'

interface CardProps {
  className?: string
}

function Card({ children, className = '' }: PropsWithChildren<CardProps>) {
  return (
    <div className={`rounded-lg border border-neutral-200 bg-white p-6 shadow-card ${className}`}>
      {children}
    </div>
  )
}

export default Card
