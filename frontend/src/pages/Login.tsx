import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import AuthInput from '../components/auth/AuthInput'
import AuthButton from '../components/auth/AuthButton'
import LoginAnimation from '../components/auth/LoginAnimation'
import { useAuthAgent } from '../components/auth/AuthAgentContext'
import { ROUTES } from '../constants/routes'
import { SESSION_EXPIRED_FLAG_KEY } from '../constants/auth'
import { authService } from '../services/auth'
import { getErrorMessage } from '../utils/http'
import { useToast } from '../contexts/ToastContext'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const agent = useAuthAgent()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_EXPIRED_FLAG_KEY)) {
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from sessionStorage (an external system) on mount
      setSessionExpired(true)
    }
  }, [])

  function handleFieldChange(setter: (value: string) => void, report?: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value)
      agent.notifyTyping()
      report?.(event.target.value)
      if (agent.status === 'error') agent.setStatus('idle')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    agent.setStatus('idle')
    setIsSubmitting(true)
    try {
      await authService.login({ email, password })
      toast('success', 'Welcome back', { description: 'Signed in successfully.' })
      agent.setStatus('success')
    } catch (err) {
      agent.setStatus('error')
      setError(getErrorMessage(err, 'Incorrect email or password.'))
      setIsSubmitting(false)
    }
  }

  function handleAnimationDone() {
    navigate(ROUTES.dashboard, { replace: true })
  }

  const animationPhase = agent.status === 'success' ? 'success' : isSubmitting ? 'submitting' : null

  return (
    <div className="relative">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Welcome back</h1>
      <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">Sign in to your MissionOS account.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {justRegistered && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-950/50 dark:text-success-300"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Account created — sign in to continue.
          </p>
        )}
        {sessionExpired && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700 dark:bg-warning-950/50 dark:text-warning-300"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Your session has expired. Please sign in again.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-950/50 dark:text-danger-300">
            {error}
          </p>
        )}
        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={handleFieldChange(setEmail, agent.reportEmail)}
          onFocus={() => agent.setFocusedField('email')}
          onBlur={() => agent.setFocusedField(null)}
          aria-invalid={Boolean(error) || undefined}
          required
        />
        <div>
          <AuthInput
            id="password"
            label="Password"
            type={agent.passwordVisible ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={handleFieldChange(setPassword, agent.reportPassword)}
            onFocus={() => agent.setFocusedField('password')}
            onBlur={() => {
              agent.setFocusedField(null)
              agent.setCapsLockOn(false)
            }}
            onKeyDown={(event) => agent.setCapsLockOn(event.getModifierState('CapsLock'))}
            onKeyUp={(event) => agent.setCapsLockOn(event.getModifierState('CapsLock'))}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={agent.capsLockOn ? 'password-caps-warning' : undefined}
            required
            rightSlot={
              <button
                type="button"
                onClick={() => agent.setPasswordVisible(!agent.passwordVisible)}
                className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label={agent.passwordVisible ? 'Hide password' : 'Show password'}
              >
                {agent.passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          {agent.capsLockOn && (
            <p id="password-caps-warning" role="alert" aria-live="polite" className="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
              ⚠ Caps Lock is ON
            </p>
          )}
        </div>
        <AuthButton type="submit" className="mt-1" isSubmitting={isSubmitting} loadingText="Signing in…">
          Sign in
        </AuthButton>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Don't have an account?{' '}
        <Link to={ROUTES.register} className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Register
        </Link>
      </p>
      {animationPhase && <LoginAnimation phase={animationPhase} variant="login" onDone={handleAnimationDone} />}
    </div>
  )
}

export default Login
