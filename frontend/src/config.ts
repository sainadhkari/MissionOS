const apiUrl = import.meta.env.VITE_API_URL

/** Single source of truth for required build-time configuration. Read once
 * here rather than reaching for `import.meta.env` throughout the codebase,
 * so there's exactly one place that knows what's required and one place
 * that decides what "missing" means. */
export const config = {
  apiUrl,
  isConfigured: Boolean(apiUrl),
}
