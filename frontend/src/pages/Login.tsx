import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import Input from '../components/Input'
import Button from '../components/Button'
import { ROUTES } from '../constants/routes'
import { authService } from '../services/auth'
import { getErrorMessage } from '../utils/http'
import { useToast } from '../contexts/ToastContext'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
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
      toast('success', 'Welcome back', { description: 'Signed in successfully.' })
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Incorrect email or password.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Welcome back</h1>
      <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">Sign in to your MissionOS account.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {justRegistered && (
          <p className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-950/50 dark:text-success-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Account created — sign in to continue.
          </p>
        )}
        {error && (
          <p className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-950/50 dark:text-danger-300">
            {error}
          </p>
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
        <Button type="submit" variant="primary" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Don't have an account?{' '}
        <Link to={ROUTES.register} className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Register
        </Link>
      </p>
    </div>
  )
}

export default Login
