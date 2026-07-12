import { Check } from 'lucide-react'

interface StepperProps {
  steps: string[]
  currentStep: number
}

function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="mb-8 flex items-center">
      {steps.map((step, index) => {
        const isComplete = index < currentStep
        const isActive = index === currentStep

        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                  isComplete
                    ? 'bg-primary-600 text-white shadow-sm'
                    : isActive
                      ? 'border-2 border-primary-600 text-primary-600 shadow-glow dark:text-primary-400'
                      : 'border border-neutral-300 text-neutral-400 dark:border-neutral-700 dark:text-neutral-600'
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={`hidden text-sm font-medium transition-colors sm:inline ${
                  isActive || isComplete ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-600'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span
                className={`mx-3 h-px flex-1 transition-colors duration-300 ${
                  isComplete ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default Stepper
