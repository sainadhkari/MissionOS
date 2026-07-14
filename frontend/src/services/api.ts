import axios from 'axios'
import { AUTH_TOKEN_KEY, SESSION_EXPIRED_FLAG_KEY } from '../constants/auth'
import { ROUTES } from '../constants/routes'
import { config } from '../config'

const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 5000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// A request made with `responseType: 'blob'` (file downloads) gets a Blob
// for `error.response.data` on failure too -- axios applies `responseType`
// to the response regardless of status code. The backend's actual error
// body is still `{"detail": "..."}` JSON underneath, just wrapped in a
// Blob instead of already parsed -- without this, `getErrorMessage`
// (utils/http.ts) can never read `.detail` off a failed blob request, and
// every such failure falls back to whatever generic message the caller
// passed, no matter what the backend actually said.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.data instanceof Blob &&
      error.response.data.type.includes('json')
    ) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        // Not valid JSON after all -- leave the Blob as-is.
      }
    }

    // A 401 only means "your session expired" if there was a session to
    // expire -- /auth/login and /auth/register themselves return 401/other
    // errors for bad credentials before any token exists, and that's a
    // normal, per-attempt error the page already surfaces, not a forced
    // logout. Checking for an existing token is what tells the two apart
    // without hardcoding either endpoint's path here.
    if (axios.isAxiosError(error) && error.response?.status === 401 && localStorage.getItem(AUTH_TOKEN_KEY)) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      if (window.location.pathname !== ROUTES.login) {
        sessionStorage.setItem(SESSION_EXPIRED_FLAG_KEY, '1')
        window.location.href = ROUTES.login
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
