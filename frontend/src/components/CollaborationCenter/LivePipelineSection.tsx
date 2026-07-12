import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import Card from '../Card'
import type { PipelineStage } from '../../utils/collaborationCenter'

const NODE_STYLES: Record<PipelineStage['status'], string> = {
  completed: 'border-primary-600 bg-primary-600 text-white shadow-glow',
  processing: 'border-warning-500 bg-warning-500 text-white animate-pulse shadow-glow',
  waiting: 'border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-600',
  failed: 'border-danger-500 bg-danger-500 text-white',
  not_available: 'border-dashed border-neutral-300 text-neutral-300 dark:border-neutral-700 dark:text-neutral-700',
}

const CONNECTOR_STYLES: Record<PipelineStage['status'], string> = {
  completed: 'bg-primary-400 dark:bg-primary-700',
  processing: 'bg-warning-400 dark:bg-warning-700',
  waiting: 'bg-neutral-200 dark:bg-neutral-800',
  failed: 'bg-danger-300 dark:bg-danger-800',
  not_available: 'bg-neutral-200 dark:bg-neutral-800',
}

const LABEL_STYLES: Record<PipelineStage['status'], string> = {
  completed: 'text-neutral-900 dark:text-neutral-100',
  processing: 'text-neutral-900 dark:text-neutral-100',
  waiting: 'text-neutral-500 dark:text-neutral-400',
  failed: 'text-danger-600 dark:text-danger-400',
  not_available: 'text-neutral-400 dark:text-neutral-600',
}

function StageIcon({ status, index }: { status: PipelineStage['status']; index: number }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
  if (status === 'processing') return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
  if (status === 'failed') return <AlertTriangle className="h-4 w-4" aria-hidden="true" />
  return <span className="text-sm font-semibold">{index + 1}</span>
}

interface LivePipelineSectionProps {
  stages: PipelineStage[]
}

/** A vertical, animated readout of the RAG + multi-agent pipeline. Node
 * color/animation communicates status (glow for completed, pulse for the
 * stage currently inferred as running, dashed for genuinely unavailable
 * data) — see `buildPipelineStages` for exactly how each status is
 * derived from real backend state. */
function LivePipelineSection({ stages }: LivePipelineSectionProps) {
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Live AI Pipeline</h2>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        Dataset → Chunks → Embeddings → ChromaDB → Retrieval → four AI agents → Executive Report.
      </p>
      <ol className="flex flex-col">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className="flex animate-fade-in-up gap-4 opacity-0"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col items-center">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${NODE_STYLES[stage.status]}`}
              >
                <StageIcon status={stage.status} index={index} />
              </span>
              {index < stages.length - 1 && (
                <span className={`min-h-[26px] w-px flex-1 transition-colors duration-300 ${CONNECTOR_STYLES[stage.status]}`} />
              )}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-semibold ${LABEL_STYLES[stage.status]}`}>{stage.label}</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {stage.detail.map((line, lineIndex) => (
                  <p
                    key={lineIndex}
                    className={
                      stage.status === 'not_available'
                        ? 'text-xs italic text-neutral-400 dark:text-neutral-600'
                        : 'text-xs text-neutral-600 dark:text-neutral-400'
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

export default LivePipelineSection
