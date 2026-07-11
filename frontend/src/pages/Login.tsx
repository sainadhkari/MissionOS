import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Input from '../components/Input'
import Button from '../components/Button'
import { ROUTES } from '../constants/routes'

function Login() {
  return (
    <div>
      <PageHeader title="Login" subtitle="Placeholder page — no authentication wired up yet." />
      <div className="flex flex-col gap-4">
        <Input id="email" label="Email" type="email" placeholder="you@company.com" />
        <Input id="password" label="Password" type="password" placeholder="••••••••" />
        <Button variant="primary" className="w-full">
          Sign in
        </Button>
      </div>
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
