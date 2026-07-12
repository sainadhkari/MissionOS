import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import OfflineBanner from '../components/OfflineBanner'

/** A fixed app shell: the sidebar and navbar never move, and only
 * `<main>` scrolls. Previously the sidebar was `position: static` on
 * desktop, which meant a long page (the Executive Report, for instance)
 * scrolled the sidebar away with everything else — this keeps navigation
 * permanently visible instead. `print:` overrides undo the height/overflow
 * constraints so a printed page isn't clipped to one viewport's worth of
 * content. */
function DashboardLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950 print:h-auto print:overflow-visible">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <OfflineBanner />
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 print:h-auto print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
