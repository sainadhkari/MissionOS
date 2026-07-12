import { Component } from 'react'
import type { ErrorInfo, PropsWithChildren, ReactNode } from 'react'
import ErrorFallback from '../ErrorFallback'

interface ErrorBoundaryState {
  hasError: boolean
}

/** Catches rendering errors anywhere below it in the tree and shows a
 * friendly fallback instead of an unstyled blank page. Class-component-only
 * React API — there's no hooks equivalent for `componentDidCatch`. */
class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          title="Something went wrong"
          description="An unexpected error occurred. Try reloading the page — if it keeps happening, please let us know."
          actionLabel="Reload"
          onAction={() => window.location.reload()}
        />
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
