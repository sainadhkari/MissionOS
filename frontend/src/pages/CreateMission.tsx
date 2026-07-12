import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Rocket, Target } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Button from '../components/Button'
import Banner from '../components/Banner'
import Badge from '../components/Badge'
import Stepper from '../components/Stepper'
import MissionForm from '../components/MissionForm'
import { missionDetailsPath } from '../constants/routes'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { missionPriorityBadgeVariant, missionPriorityLabel } from '../utils/mission'
import { EMPTY_MISSION_FORM_VALUES } from '../types/Mission'
import type { MissionFormValues } from '../types/Mission'

const STEPS = ['Mission Information', 'Review', 'Launch']

const REVIEW_FIELDS: { key: keyof MissionFormValues; label: string }[] = [
  { key: 'problemStatement', label: 'Problem Statement' },
  { key: 'objective', label: 'Business Objective' },
  { key: 'expectedOutput', label: 'Expected Output' },
]

function CreateMission() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<MissionFormValues>(EMPTY_MISSION_FORM_VALUES)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFirstStep = step === 0
  const isLastStep = step === STEPS.length - 1

  const isMissionInfoComplete =
    values.title.trim() !== '' &&
    values.businessDomain.trim() !== '' &&
    values.problemStatement.trim() !== '' &&
    values.objective.trim() !== '' &&
    values.expectedOutput.trim() !== ''

  async function handleLaunch() {
    setError(null)
    setIsSubmitting(true)
    try {
      const mission = await missionService.create(values)
      navigate(missionDetailsPath(mission.id), { replace: true, state: { created: true } })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create mission. Please try again.'))
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Create Mission" subtitle="Define a new mission for MissionOS to work on." />

      <Card>
        <Stepper steps={STEPS} currentStep={step} />

        {error && (
          <Banner variant="danger" className="mb-5">
            {error}
          </Banner>
        )}

        <div key={step} className="animate-fade-in-up">
          {step === 0 && <MissionForm values={values} onChange={setValues} />}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {values.title || '—'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {values.businessDomain || '—'}
                    </span>
                    <Badge variant={missionPriorityBadgeVariant(values.priority)}>
                      {missionPriorityLabel(values.priority)}
                    </Badge>
                  </div>
                </div>
              </div>

              {REVIEW_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {label}
                  </h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                    {values[key] || '—'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
                <Rocket className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Ready to launch</p>
                <p className="mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
                  This creates the mission as a draft. You can upload datasets and start AI analysis any time
                  from Mission History.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                Next step: attach a dataset and run analysis
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <Button
            variant="outline"
            disabled={isFirstStep}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Previous
          </Button>
          {isLastStep ? (
            <Button variant="primary" onClick={handleLaunch} disabled={isSubmitting}>
              {isSubmitting ? 'Launching…' : 'Launch Mission'}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={step === 0 && !isMissionInfoComplete}
              onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
            >
              Next
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export default CreateMission
