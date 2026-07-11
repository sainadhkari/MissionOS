import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Button from '../components/Button'
import Banner from '../components/Banner'
import Stepper from '../components/Stepper'
import MissionForm from '../components/MissionForm'
import { missionDetailsPath } from '../constants/routes'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { EMPTY_MISSION_FORM_VALUES } from '../types/Mission'
import type { MissionFormValues } from '../types/Mission'

const STEPS = ['Mission Information', 'Review', 'Launch']

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

        {step === 0 && <MissionForm values={values} onChange={setValues} />}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Mission Name
              </h2>
              <p className="mt-1 text-sm text-neutral-700">{values.title || '—'}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Business Domain / Priority
              </h2>
              <p className="mt-1 text-sm text-neutral-700">
                {values.businessDomain || '—'} · {values.priority}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Problem Statement
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {values.problemStatement || '—'}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Business Objective
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {values.objective || '—'}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Expected Output
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                {values.expectedOutput || '—'}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">Ready to launch</p>
            <p className="max-w-xs text-sm text-neutral-500">
              This creates the mission as a draft. You can edit it any time from Mission History.
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-6">
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
