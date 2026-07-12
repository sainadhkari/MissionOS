import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import Badge from '../Badge'
import type { BadgeVariant } from '../Badge'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string
  badgeLabel?: string
  badgeVariant?: BadgeVariant
  caption?: string
}

function KpiCard({ icon: Icon, label, value, badgeLabel, badgeVariant = 'neutral', caption }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-neutral-900">{value}</span>
        {badgeLabel && <Badge variant={badgeVariant}>{badgeLabel}</Badge>}
      </div>
      {caption && <p className="text-xs text-neutral-400">{caption}</p>}
    </Card>
  )
}

export default KpiCard
