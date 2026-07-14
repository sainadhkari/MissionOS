export const AUTH_TOKEN_KEY = 'missionos_access_token'

/** Set right before a forced-logout redirect (see services/api.ts's 401
 * handler); Login reads it once on mount to show why the user landed there,
 * then clears it so it can't reappear on an unrelated later visit. */
export const SESSION_EXPIRED_FLAG_KEY = 'missionos_session_expired'
