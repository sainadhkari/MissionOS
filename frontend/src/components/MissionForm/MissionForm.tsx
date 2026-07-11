import Input from '../Input'
import Select from '../Select'
import Textarea from '../Textarea'
import { FormRow } from '../Form'
import type { MissionFormValues, MissionPriority, MissionStatus } from '../../types/Mission'
import { missionPriorityLabel, missionStatusLabel } from '../../utils/mission'

const BUSINESS_DOMAINS = [
  'Finance',
  'Healthcare',
  'Retail',
  'Manufacturing',
  'Technology',
  'Operations',
  'Other',
]

const PRIORITIES: MissionPriority[] = ['low', 'medium', 'high', 'critical']
const STATUSES: MissionStatus[] = ['draft', 'ready', 'processing', 'completed', 'failed']

interface MissionFormProps {
  values: MissionFormValues
  onChange: (values: MissionFormValues) => void
  showStatus?: boolean
}

function MissionForm({ values, onChange, showStatus = false }: MissionFormProps) {
  function update<K extends keyof MissionFormValues>(key: K, value: MissionFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="flex flex-col gap-5">
      <Input
        id="title"
        label="Mission Name"
        placeholder="e.g. Q3 Churn Reduction"
        value={values.title}
        onChange={(event) => update('title', event.target.value)}
        required
      />

      <FormRow>
        <Select
          id="businessDomain"
          label="Business Domain"
          value={values.businessDomain}
          onChange={(event) => update('businessDomain', event.target.value)}
          required
        >
          <option value="" disabled>
            Select a domain
          </option>
          {BUSINESS_DOMAINS.map((domain) => (
            <option key={domain} value={domain}>
              {domain}
            </option>
          ))}
        </Select>

        <Select
          id="priority"
          label="Priority"
          value={values.priority}
          onChange={(event) => update('priority', event.target.value as MissionPriority)}
          required
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {missionPriorityLabel(priority)}
            </option>
          ))}
        </Select>
      </FormRow>

      {showStatus && (
        <Select
          id="status"
          label="Status"
          value={values.status}
          onChange={(event) => update('status', event.target.value as MissionStatus)}
          required
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {missionStatusLabel(status)}
            </option>
          ))}
        </Select>
      )}

      <Textarea
        id="problemStatement"
        label="Problem Statement"
        placeholder="What problem are we solving?"
        rows={3}
        value={values.problemStatement}
        onChange={(event) => update('problemStatement', event.target.value)}
        required
      />
      <Textarea
        id="objective"
        label="Business Objective"
        placeholder="What outcome are we aiming for?"
        rows={3}
        value={values.objective}
        onChange={(event) => update('objective', event.target.value)}
        required
      />
      <Textarea
        id="expectedOutput"
        label="Expected Output"
        placeholder="What should the mission produce?"
        rows={3}
        value={values.expectedOutput}
        onChange={(event) => update('expectedOutput', event.target.value)}
        required
      />
    </div>
  )
}

export default MissionForm
