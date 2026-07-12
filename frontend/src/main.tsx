import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/globals.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorFallback from './components/ErrorFallback'
import { config } from './config'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'

const root = createRoot(document.getElementById('root')!)

if (!config.isConfigured) {
  // Fails visibly and immediately rather than letting every API call
  // throw a cryptic network error one at a time — this can only happen if
  // the build is missing VITE_API_URL, not from anything a user did.
  root.render(
    <StrictMode>
      <ErrorFallback
        title="Configuration error"
        description="This deployment is missing its API URL configuration (VITE_API_URL). Please contact the site administrator."
      />
    </StrictMode>
  )
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
