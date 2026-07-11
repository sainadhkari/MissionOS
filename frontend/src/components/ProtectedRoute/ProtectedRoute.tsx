import type { PropsWithChildren } from 'react'

// Placeholder only — no auth check wired in yet.
function ProtectedRoute({ children }: PropsWithChildren) {
  return <>{children}</>
}

export default ProtectedRoute
