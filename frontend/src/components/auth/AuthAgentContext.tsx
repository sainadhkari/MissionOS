import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export type FocusedField = 'email' | 'password' | null
export type AuthStatus = 'idle' | 'submitting' | 'error' | 'success'

interface CursorPosition {
  x: number
  y: number
}

interface AuthAgentContextValue {
  cursor: CursorPosition
  focusedField: FocusedField
  isTyping: boolean
  passwordVisible: boolean
  cardHovered: boolean
  status: AuthStatus
  prefersReducedMotion: boolean
  emailLength: number
  passwordLength: number
  emailValid: boolean
  capsLockOn: boolean
  setFocusedField: (field: FocusedField) => void
  notifyTyping: () => void
  setPasswordVisible: (visible: boolean) => void
  setCardHovered: (hovered: boolean) => void
  setStatus: (status: AuthStatus) => void
  reportPointer: (x: number, y: number) => void
  reportEmail: (value: string) => void
  reportPassword: (value: string) => void
  setCapsLockOn: (on: boolean) => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const AuthAgentContext = createContext<AuthAgentContextValue | null>(null)

export function AuthAgentProvider({ children }: PropsWithChildren) {
  const prefersReducedMotion = Boolean(useReducedMotion())
  const [cursor, setCursor] = useState<CursorPosition>({ x: 0, y: 0 })
  const [focusedField, setFocusedField] = useState<FocusedField>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [cardHovered, setCardHovered] = useState(false)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [emailLength, setEmailLength] = useState(0)
  const [passwordLength, setPasswordLength] = useState(0)
  const [emailValid, setEmailValid] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notifyTyping = useCallback(() => {
    if (prefersReducedMotion) return
    setIsTyping(true)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => setIsTyping(false), 600)
  }, [prefersReducedMotion])

  const reportPointer = useCallback(
    (x: number, y: number) => {
      if (prefersReducedMotion) return
      setCursor({ x, y })
    },
    [prefersReducedMotion]
  )

  const reportEmail = useCallback((value: string) => {
    setEmailLength(value.length)
    setEmailValid(EMAIL_PATTERN.test(value))
  }, [])

  const reportPassword = useCallback((value: string) => {
    setPasswordLength(value.length)
  }, [])

  // Login and Register share this one provider instance (AuthLayout doesn't
  // remount between sibling routes), so without this, revealing a password
  // or hitting an error on one page would still be visible after navigating
  // to the other. Reset on every route change so each auth page starts
  // clean. A `key`-forced remount would also reset MissionAIScene (replaying
  // its wake-up animation on every nav), which is out of scope here, so this
  // targeted reset is intentional. useLayoutEffect (not useEffect) so it
  // resolves before paint -- otherwise the stale, unmasked password state
  // could flash for a frame.
  const location = useLocation()
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing to the router's location, not to a value derivable during render
    setFocusedField(null)
    setIsTyping(false)
    setPasswordVisible(false)
    setStatus('idle')
    setEmailLength(0)
    setPasswordLength(0)
    setEmailValid(false)
    setCapsLockOn(false)
  }, [location.pathname])

  const value = useMemo(
    () => ({
      cursor,
      focusedField,
      isTyping,
      passwordVisible,
      cardHovered,
      status,
      prefersReducedMotion,
      emailLength,
      passwordLength,
      emailValid,
      capsLockOn,
      setFocusedField,
      notifyTyping,
      setPasswordVisible,
      setCardHovered,
      setStatus,
      reportPointer,
      reportEmail,
      reportPassword,
      setCapsLockOn,
    }),
    [
      cursor,
      focusedField,
      isTyping,
      passwordVisible,
      cardHovered,
      status,
      prefersReducedMotion,
      emailLength,
      passwordLength,
      emailValid,
      capsLockOn,
      notifyTyping,
      reportPointer,
      reportEmail,
      reportPassword,
    ]
  )

  return <AuthAgentContext.Provider value={value}>{children}</AuthAgentContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook belongs with its provider
export function useAuthAgent(): AuthAgentContextValue {
  const context = useContext(AuthAgentContext)
  if (!context) {
    throw new Error('useAuthAgent must be used within an AuthAgentProvider')
  }
  return context
}
