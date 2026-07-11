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
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  isComplete
                    ? 'bg-primary-600 text-white'
                    : isActive
                      ? 'border-2 border-primary-600 text-primary-600'
                      : 'border border-neutral-300 text-neutral-400'
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isActive || isComplete ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className={`mx-3 h-px flex-1 ${isComplete ? 'bg-primary-600' : 'bg-neutral-200'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default Stepper
