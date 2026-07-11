import type { ReactNode } from 'react'

interface AnalysisSectionProps {
  title: string
  children: ReactNode
}

function AnalysisSection({ title, children }: AnalysisSectionProps) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

export function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">None identified.</p>
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2 text-sm text-neutral-700">
          <span
            className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default AnalysisSection
