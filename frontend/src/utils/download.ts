export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function filenameFromContentDisposition(
  header: string | undefined,
  fallback: string
): string {
  if (!header) return fallback
  const match = /filename="?([^";]+)"?/.exec(header)
  return match ? match[1] : fallback
}
