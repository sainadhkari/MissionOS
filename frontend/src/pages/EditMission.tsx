import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import EmptyState from '../components/EmptyState'
import Button, { buttonClasses } from '../components/Button'
import { FormActions } from '../components/Form'
import MissionForm from '../components/MissionForm'
import { ROUTES, missionDetailsPath } from '../constants/routes'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { missionToFormValues } from '../types/Mission'
import type { MissionFormValues } from '../types/Mission'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success' }

function EditMission() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [values, setValues] = useState<MissionFormValues | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!missionId) return
    missionService
      .get(missionId)
      .then((mission) => {
        setValues(missionToFormValues(mission))
        setLoadState({ status: 'success' })
      })
      .catch((err) =>
        setLoadState({ status: 'error', message: getErrorMessage(err, 'Mission not found.') })
      )
  }, [missionId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!missionId || !values) return

    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await missionService.update(missionId, values)
      navigate(missionDetailsPath(missionId), { replace: true, state: { updated: true } })
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Could not save changes.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadState.status === 'loading') {
    return (
      <div>
        <PageHeader title="Edit Mission" />
        <Loading />
      </div>
    )
  }

  if (loadState.status === 'error') {
    return (
      <div>
        <PageHeader title="Edit Mission" />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={loadState.message}
            action={
              <Link to={ROUTES.missionHistory} className={buttonClasses('outline', 'sm')}>
                Back to Mission History
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Edit Mission" subtitle="Update this mission's details." />
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {submitError && <Banner variant="danger">{submitError}</Banner>}

          <MissionForm values={values!} onChange={setValues} showStatus />

          <FormActions className="mt-3 border-t border-neutral-200 pt-6">
            <Link to={missionDetailsPath(missionId!)} className={buttonClasses('outline')}>
              Cancel
            </Link>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </FormActions>
        </form>
      </Card>
    </div>
  )
}

export default EditMission
