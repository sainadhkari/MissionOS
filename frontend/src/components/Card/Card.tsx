import type { CSSProperties, PropsWithChildren } from 'react'

interface CardProps {
  className?: string
  style?: CSSProperties
}

function Card({ children, className = '', style }: PropsWithChildren<CardProps>) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-6 shadow-card transition-colors dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export default Card
