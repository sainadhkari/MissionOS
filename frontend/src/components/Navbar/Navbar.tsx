import { Boxes, Menu, User } from 'lucide-react'
import { APP_NAME } from '../../constants/app'

interface NavbarProps {
  onMenuClick: () => void
}

function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="border-b border-neutral-200 bg-white shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
            <Boxes className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold text-neutral-900">{APP_NAME}</span>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </header>
  )
}

export default Navbar
