import { CheckCircle2 } from 'lucide-react'
import type { DecisionTraceStage } from '../../utils/explainability'

interface AIDecisionTraceProps {
  stages: DecisionTraceStage[]
}

/** Renders the Dataset → Chunks → Embeddings → Retrieval → (four agents) →
 * Final Recommendation pipeline as a vertical trace, annotated at each
 * stage with real, currently-available figures. */
function AIDecisionTrace({ stages }: AIDecisionTraceProps) {
  return (
    <ol className="flex flex-col">
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="flex animate-fade-in-up gap-4 opacity-0"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex flex-col items-center">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-300 ${
                stage.status === 'complete'
                  ? 'border-primary-600 bg-primary-600 text-white shadow-glow'
                  : 'border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-600'
              }`}
            >
              {stage.status === 'complete' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            {index < stages.length - 1 && (
              <span
                className={`min-h-[24px] w-px flex-1 transition-colors duration-300 ${
                  stage.status === 'complete' ? 'bg-primary-300 dark:bg-primary-800' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            )}
          </div>
          <div className="pb-6">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{stage.label}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {stage.detail.map((line, lineIndex) => (
                <p
                  key={lineIndex}
                  className={
                    line === 'Not Available'
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
  )
}

export default AIDecisionTrace
