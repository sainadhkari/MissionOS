export type MissionPriority = 'low' | 'medium' | 'high' | 'critical'
export type MissionStatus = 'draft' | 'ready' | 'processing' | 'completed' | 'failed'

export interface Mission {
  id: string
  title: string
  business_domain: string
  priority: MissionPriority
  problem_statement: string
  objective: string
  expected_output: string
  status: MissionStatus
  created_at: string
  updated_at: string
}

export interface MissionFormValues {
  title: string
  businessDomain: string
  priority: MissionPriority
  problemStatement: string
  objective: string
  expectedOutput: string
  status: MissionStatus
}

export function missionToFormValues(mission: Mission): MissionFormValues {
  return {
    title: mission.title,
    businessDomain: mission.business_domain,
    priority: mission.priority,
    problemStatement: mission.problem_statement,
    objective: mission.objective,
    expectedOutput: mission.expected_output,
    status: mission.status,
  }
}

export const EMPTY_MISSION_FORM_VALUES: MissionFormValues = {
  title: '',
  businessDomain: '',
  priority: 'medium',
  problemStatement: '',
  objective: '',
  expectedOutput: '',
  status: 'draft',
}
