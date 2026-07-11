import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Input from '../components/Input'
import Button from '../components/Button'
import { ROUTES } from '../constants/routes'
import { authService } from '../services/auth'
import { getErrorMessage } from '../utils/http'

function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.register({ fullName, email, password })
      navigate(ROUTES.login, { replace: true, state: { registered: true } })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Register" subtitle="Create your MissionOS account." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        )}
        <Input
          id="fullName"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to={ROUTES.login} className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default Register
