import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import Reveal from './Reveal'

function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-violet-600 to-primary-700 py-20 sm:py-28">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.15),transparent_45%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to transform business decisions?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
            Create a mission, upload a dataset, and see an executive-ready analysis in minutes.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={ROUTES.register}
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to={ROUTES.login}
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default CTASection
