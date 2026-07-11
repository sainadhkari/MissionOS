import { useState } from 'react'
import { Rocket } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Input from '../components/Input'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import Button from '../components/Button'
import { FormRow } from '../components/Form'
import Stepper from '../components/Stepper'
import EmptyState from '../components/EmptyState'

const STEPS = ['Mission Information', 'Review', 'Launch']

const BUSINESS_DOMAINS = ['Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Technology', 'Operations', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

function CreateMission() {
  const [step, setStep] = useState(0)
  const isFirstStep = step === 0
  const isLastStep = step === STEPS.length - 1

  return (
    <div>
      <PageHeader
        title="Create Mission"
        subtitle="Placeholder page — define a new mission for MissionOS to work on."
      />

      <Card>
        <Stepper steps={STEPS} currentStep={step} />

        {step === 0 && (
          <div className="flex flex-col gap-5">
            <Input id="missionName" label="Mission Name" placeholder="e.g. Q3 Churn Reduction" />

            <FormRow>
              <Select id="businessDomain" label="Business Domain" defaultValue="">
                <option value="" disabled>
                  Select a domain
                </option>
                {BUSINESS_DOMAINS.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </Select>

              <Select id="priority" label="Priority" defaultValue="">
                <option value="" disabled>
                  Select a priority
                </option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </FormRow>

            <Textarea
              id="problemStatement"
              label="Problem Statement"
              placeholder="What problem are we solving?"
              rows={3}
            />
            <Textarea
              id="businessObjective"
              label="Business Objective"
              placeholder="What outcome are we aiming for?"
              rows={3}
            />
            <Textarea
              id="expectedOutput"
              label="Expected Output"
              placeholder="What should the mission produce?"
              rows={3}
            />
          </div>
        )}

        {step > 0 && (
          <EmptyState
            icon={Rocket}
            title={`${STEPS[step]} — coming soon`}
            description="This step will be available in a future update."
          />
        )}

        <div className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-6">
          <Button
            variant="outline"
            disabled={isFirstStep}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="primary"
            disabled={isLastStep}
            onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default CreateMission
