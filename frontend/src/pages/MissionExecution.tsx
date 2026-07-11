import { useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'

function MissionExecution() {
  const { missionId } = useParams()

  return (
    <div>
      <PageHeader title="Mission Execution" subtitle="Placeholder page." />
      <Card>
        <p className="text-sm text-slate-500">Mission ID: {missionId}</p>
      </Card>
    </div>
  )
}

export default MissionExecution
