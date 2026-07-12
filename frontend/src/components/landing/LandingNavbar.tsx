import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boxes, Menu, X } from 'lucide-react'
import { APP_NAME } from '../../constants/app'
import { ROUTES } from '../../constants/routes'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#ai-agents', label: 'AI Agents' },
  { href: '#executive-dashboard', label: 'Executive Dashboard' },
]

function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 8)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'border-b border-neutral-200 bg-white/80 shadow-xs backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to={ROUTES.landing} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-glow">
            <Boxes className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight text-neutral-900">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {link.label}
            </a>
          ))}
          <span className="flex cursor-not-allowed items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-neutral-400">
            Documentation
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
              Soon
            </span>
          </span>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to={ROUTES.login}
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Login
          </Link>
          <Link
            to={ROUTES.register}
            className="rounded-md bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 lg:hidden"
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {link.label}
              </a>
            ))}
            <span className="flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-400">
              Documentation
              <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                Soon
              </span>
            </span>
            <div className="mt-2 flex flex-col gap-2 border-t border-neutral-200 pt-3">
              <Link
                to={ROUTES.login}
                className="rounded-md px-3 py-2.5 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Login
              </Link>
              <Link
                to={ROUTES.register}
                className="rounded-md bg-gradient-to-r from-primary-600 to-violet-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-glow"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default LandingNavbar
