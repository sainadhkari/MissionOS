import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Input from '../components/Input'
import Button from '../components/Button'
import { ROUTES } from '../constants/routes'
import { authService } from '../services/auth'
import { getErrorMessage } from '../utils/http'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authService.login({ email, password })
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Incorrect email or password.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Login" subtitle="Sign in to your MissionOS account." />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {justRegistered && (
          <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-700">
            Account created — sign in to continue.
          </p>
        )}
        {error && (
          <p className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        )}
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
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        Don't have an account?{' '}
        <Link to={ROUTES.register} className="font-medium text-primary-600 hover:text-primary-700">
          Register
        </Link>
      </p>
    </div>
  )
}

export default Login
