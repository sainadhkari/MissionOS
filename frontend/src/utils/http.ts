import axios from 'axios'

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}
