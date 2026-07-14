import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthInput from '../components/auth/AuthInput'
import AuthButton from '../components/auth/AuthButton'
import LoginAnimation from '../components/auth/LoginAnimation'
import { useAuthAgent } from '../components/auth/AuthAgentContext'
import { ROUTES } from '../constants/routes'
import { authService } from '../services/auth'
import { getErrorMessage } from '../utils/http'

function Register() {
  const navigate = useNavigate()
  const agent = useAuthAgent()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      await authService.register({ fullName, email, password })
      agent.setStatus('success')
    } catch (err) {
      agent.setStatus('error')
      setError(getErrorMessage(err, 'Could not create your account. Please try again.'))
      setIsSubmitting(false)
    }
  }

  function handleAnimationDone() {
    navigate(ROUTES.login, { replace: true, state: { registered: true } })
  }

  const animationPhase = agent.status === 'success' ? 'success' : isSubmitting ? 'submitting' : null

  return (
    <div className="relative">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        Start turning data into decisions with MissionOS.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:bg-danger-950/50 dark:text-danger-300">
            {error}
          </p>
        )}
        <AuthInput
          id="fullName"
          label="Full name"
          autoComplete="name"
          value={fullName}
          onChange={handleFieldChange(setFullName)}
          onFocus={() => agent.setFocusedField('email')}
          onBlur={() => agent.setFocusedField(null)}
          aria-invalid={Boolean(error) || undefined}
          required
        />
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
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
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
        <AuthButton type="submit" className="mt-1" isSubmitting={isSubmitting} loadingText="Creating account…">
          Create account
        </AuthButton>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Already have an account?{' '}
        <Link to={ROUTES.login} className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Sign in
        </Link>
      </p>
      {animationPhase && <LoginAnimation phase={animationPhase} variant="register" onDone={handleAnimationDone} />}
    </div>
  )
}

export default Register
