import { Briefcase, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import Badge from '../Badge'
import { confidenceBadgeVariant } from '../../utils/executiveDashboard'
import type { AgentName, ConversationEntry } from '../../utils/collaborationCenter'

const AGENT_ICONS: Record<AgentName, LucideIcon> = {
  Business: Briefcase,
  Strategy: Target,
  Risk: ShieldAlert,
  Executive: Sparkles,
}

interface AgentConversationSectionProps {
  entries: ConversationEntry[]
}

/** Presents each agent's already-stored output as a sequential handoff —
 * Business's assessment feeding Strategy's response, and so on down to
 * Executive's final decision. This is a read-only replay of stored data,
 * not a live or generated chat: no new text is produced here. */
function AgentConversationSection({ entries }: AgentConversationSectionProps) {
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Agent Conversation</h2>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        A sequential replay of each agent's own stored output — not a live or generated conversation.
      </p>
      <div className="flex flex-col">
        {entries.map((entry, index) => {
          const Icon = AGENT_ICONS[entry.agentName]
          return (
            <div key={entry.agentName} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {index < entries.length - 1 && <span className="mt-1 min-h-[24px] w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
              </div>
              <div className="mb-4 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {entry.agentName} Agent — {entry.heading}
                  </p>
                  {entry.confidencePercent !== null ? (
                    <Badge variant={confidenceBadgeVariant(entry.confidencePercent / 100)}>
                      {entry.confidencePercent}%
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Not Available</Badge>
                  )}
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{entry.body ?? 'Not Available'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default AgentConversationSection
