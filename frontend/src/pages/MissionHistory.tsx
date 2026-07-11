import { Link } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import { Table, TableBody, TableHeader, TableHeaderCell, TableRow, TableCell } from '../components/Table'
import { buttonClasses } from '../components/Button'
import { ROUTES } from '../constants/routes'
import type { Mission } from '../types/Mission'

const missions: Mission[] = []

function MissionHistory() {
  return (
    <div>
      <PageHeader
        title="Mission History"
        subtitle="Placeholder page."
        actions={
          <Link to={ROUTES.createMission} className={buttonClasses('primary', 'sm')}>
            New Mission
          </Link>
        }
      />

      {missions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No missions yet"
          description="Create your first mission to see it here."
          action={
            <Link to={ROUTES.createMission} className={buttonClasses('outline', 'sm')}>
              New Mission
            </Link>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Mission</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Owner</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {missions.map((mission) => (
              <TableRow key={mission.id}>
                <TableCell>{mission.title}</TableCell>
                <TableCell>{mission.status}</TableCell>
                <TableCell>{mission.createdAt}</TableCell>
                <TableCell>{mission.owner}</TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default MissionHistory
