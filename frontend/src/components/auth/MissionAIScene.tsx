/* eslint-disable react-hooks/refs, react-hooks/immutability, react-hooks/set-state-in-effect --
   this scene drives SVG transforms via mutable refs on every animation frame and reacts to
   `mode` changes (focus/typing/status) with one-shot setState inside effects (e.g. success burst,
   error shake); both are intentional escape hatches from the React Compiler's purity assumptions.
   See missionSceneHooks.ts for the fuller rationale. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthAgent } from './AuthAgentContext'
import SceneCharacter from './SceneCharacter'
import { useBlink, useBreathe, useCompanionDirector, useFloat, useParallax, useParticles } from './missionSceneHooks'
import type { CharacterKey, CharacterRefs, DirectorBeats, DirectorCharacterConfig, EyeState, MouthState, SceneMode } from './missionSceneTypes'

const ACCENT = {
  executive: '#E9C98A',
  business: '#5B8DEF',
  strategy: '#9B8CFA',
  risk: '#E3A25E',
}

// Non-uniform hero scaling: executive +26%, business/strategy +21%, risk
// +17% over the original halves, so the executive reads as the clear leader
// and the team still shows a visible size hierarchy (exec > biz/strat >
// risk). Positions are rebalanced (not just scaled) to keep glow-to-glow
// spacing generous at the new sizes within the same 520-wide canvas; the
// canvas height grew from 360 to 380 to give the bigger composition room
// without cramming the vertical spacing.
const CHAR_LAYOUT = {
  executive: { cx: 260, cy: 120, half: 58 },
  business: { cx: 122, cy: 238, half: 40 },
  strategy: { cx: 398, cy: 238, half: 40 },
  risk: { cx: 260, cy: 283, half: 34 },
} as const

// executive stays smallest/slowest throughout: "rarely moves; when it moves,
// everyone notices."
const FLOAT_CFG = {
  executive: { amplitude: 3.2, speed: 0.4, phase: 0 },
  business: { amplitude: 4, speed: 0.62, phase: 1.1 },
  strategy: { amplitude: 5, speed: 0.7, phase: 2.4 },
  risk: { amplitude: 4.4, speed: 0.55, phase: 3.6 },
}
const BREATHE_CFG = {
  executive: { min: 1, max: 1.012, speed: 0.22, phase: 0 },
  business: { min: 1, max: 1.017, speed: 0.4, phase: 1.4 },
  strategy: { min: 1, max: 1.024, speed: 0.55, phase: 2.1 },
  risk: { min: 1, max: 1.016, speed: 0.36, phase: 0.7 },
}
const BLINK_CADENCE = {
  executive: { min: 6500, max: 11000 },
  business: { min: 4200, max: 8200 },
  strategy: { min: 2400, max: 5200 },
  risk: { min: 3400, max: 6200 },
}

function deriveMode(
  status: string,
  focusedField: string | null,
  passwordLength: number,
  passwordVisible: boolean,
  cardHovered: boolean
): SceneMode {
  if (status === 'submitting') return 'submitting'
  if (status === 'success') return 'success'
  if (status === 'error') return 'error'
  if (focusedField === 'password' && passwordLength > 0) return passwordVisible ? 'reveal' : 'password'
  if (focusedField === 'email') return 'email'
  if (cardHovered) return 'hover'
  return 'idle'
}

function useCharRefs() {
  return useRef<Record<CharacterKey, CharacterRefs>>({
    executive: {} as CharacterRefs,
    business: {} as CharacterRefs,
    strategy: {} as CharacterRefs,
    risk: {} as CharacterRefs,
  })
}

function usePulseRefs() {
  return useRef<Record<CharacterKey, { current: number }>>({
    business: { current: 0 },
    strategy: { current: 0 },
    risk: { current: 0 },
    executive: { current: 0 },
  }).current
}

function MissionAIScene() {
  const { status, focusedField, passwordVisible, cardHovered, prefersReducedMotion, emailLength, passwordLength, emailValid, capsLockOn } =
    useAuthAgent()

  const containerRef = useRef<HTMLDivElement>(null)
  const refs = useCharRefs()
  const pathRefs = useRef<Record<'business' | 'strategy' | 'risk', SVGPathElement | null>>({ business: null, strategy: null, risk: null })
  const dotRefs = useRef<Record<'business' | 'strategy' | 'risk', SVGCircleElement | null>>({ business: null, strategy: null, risk: null })
  const particleSpeedMult = useRef(1)

  // Tracks the one-off (non-effect) setTimeouts below (smile flash, glow
  // pulse, particle boost, random peek) so a mid-flight timer can't fire
  // setState after this component unmounts.
  const pendingTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  useEffect(() => {
    const timersOnMount = pendingTimers.current
    return () => {
      timersOnMount.forEach((timer) => clearTimeout(timer))
      timersOnMount.clear()
    }
  }, [])
  const scheduleTimeout = (fn: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pendingTimers.current.delete(timer)
      fn()
    }, delay)
    pendingTimers.current.add(timer)
  }

  const mode = deriveMode(status, focusedField, passwordLength, passwordVisible, cardHovered)
  const modeRef = useRef<SceneMode>(mode)
  modeRef.current = mode

  const motionEnabled = !prefersReducedMotion

  // transient decaying pulses, layered on top of the continuous loops so a
  // "nod" or a "lean" settles naturally instead of snapping
  const nodRefs = usePulseRefs()
  const leanRefs = usePulseRefs()
  const raiseRefs = usePulseRefs()

  const [flashSmile, setFlashSmile] = useState<Partial<Record<CharacterKey, boolean>>>({})
  const [teamPulse, setTeamPulse] = useState(false)
  const [randomPeek, setRandomPeek] = useState(false)

  // everyone starts "asleep" (eyes closed, no glow) and wakes in a staggered
  // order, executive last - a leader arrives calmly, once everyone else is
  // already present
  const [booted, setBooted] = useState<Record<CharacterKey, boolean>>({
    business: false,
    strategy: false,
    risk: false,
    executive: false,
  })
  useEffect(() => {
    if (!motionEnabled) {
      setBooted({ business: true, strategy: true, risk: true, executive: true })
      return
    }
    const order: [CharacterKey, number][] = [
      ['risk', 300],
      ['business', 520],
      ['strategy', 720],
      ['executive', 1050],
    ]
    const timers = order.map(([key, delay]) => setTimeout(() => setBooted((b) => ({ ...b, [key]: true })), delay))
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount only
  }, [])

  const triggerNod = (key: CharacterKey) => {
    nodRefs[key].current -= 6.5
  }
  const triggerLean = (key: CharacterKey) => {
    leanRefs[key].current += 0.018
  }
  const triggerEyeRaise = (key: CharacterKey) => {
    raiseRefs[key].current += 1.6
  }
  const triggerSmileFlash = (key: CharacterKey) => {
    setFlashSmile((f) => ({ ...f, [key]: true }))
    scheduleTimeout(() => setFlashSmile((f) => ({ ...f, [key]: false })), 1100)
  }
  const triggerGlowPulse = () => {
    setTeamPulse(true)
    scheduleTimeout(() => setTeamPulse(false), 1400)
  }

  // ambient heartbeat: every 60-90s of genuine idle, the whole team glows in
  // unison for a moment - a sign the system is alive even when nothing's
  // happening
  useEffect(() => {
    if (!motionEnabled) return
    let timer: ReturnType<typeof setTimeout>
    const loop = () => {
      if (modeRef.current === 'idle') triggerGlowPulse()
      timer = setTimeout(loop, 60000 + Math.random() * 30000)
    }
    timer = setTimeout(loop, 60000 + Math.random() * 30000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- triggerGlowPulse only touches stable state setters/refs via scheduleTimeout; not chasing its identity
  }, [motionEnabled])

  const triggerParticleBoost = () => {
    const restore = modeRef.current === 'success' ? 2.4 : modeRef.current === 'submitting' ? 1.5 : 1
    particleSpeedMult.current = 1.4
    scheduleTimeout(() => {
      particleSpeedMult.current = restore
    }, 1000)
  }
  const triggerNotice = () => {
    triggerEyeRaise('risk')
  }

  // PRIVACY MODE state machine: entering is delayed (anticipation) and
  // exiting lingers (no instant snap back)
  const isPasswordy = mode === 'password' || mode === 'reveal'
  const [privacyOn, setPrivacyOn] = useState(false)
  const privacyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const wasPeekingRef = useRef(false)

  useEffect(() => {
    clearTimeout(privacyTimer.current)
    if (isPasswordy) {
      privacyTimer.current = setTimeout(() => setPrivacyOn(true), 250)
    } else {
      privacyTimer.current = setTimeout(() => setPrivacyOn(false), 400)
    }
    return () => clearTimeout(privacyTimer.current)
  }, [isPasswordy])

  // only one companion peeks, and only once privacy mode has actually
  // settled in
  const isPeeking = privacyOn && mode === 'reveal'
  useEffect(() => {
    if (isPeeking && !wasPeekingRef.current) {
      triggerEyeRaise('business')
    }
    wasPeekingRef.current = isPeeking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeeking])

  // risk catches it first: on a failed attempt, risk flashes red a beat
  // before the whole scene shakes
  const [riskAlert, setRiskAlert] = useState(false)
  const [sceneShake, setSceneShake] = useState(false)
  useEffect(() => {
    if (mode === 'error') {
      setRiskAlert(true)
      triggerEyeRaise('risk')
      const t1 = setTimeout(() => setSceneShake(true), 180)
      const t2 = setTimeout(() => setRiskAlert(false), 650)
      const t3 = setTimeout(() => setSceneShake(false), 700)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }
    setRiskAlert(false)
    setSceneShake(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // cinematic success burst: a brief outward pulse from executive, once
  const [successBurst, setSuccessBurst] = useState(0)
  useEffect(() => {
    if (mode === 'success') setSuccessBurst((k) => k + 1)
  }, [mode])

  // consensus convergence: the instant the user submits, particles restart
  // and rush toward executive together
  const [submitBurst, setSubmitBurst] = useState(0)
  useEffect(() => {
    if (mode === 'submitting') {
      setSubmitBurst((k) => k + 1)
      particleSpeedMult.current = 3.2
      const t = setTimeout(() => {
        particleSpeedMult.current = 1.5
      }, 700)
      return () => clearTimeout(t)
    }
  }, [mode])

  useEffect(() => {
    particleSpeedMult.current = mode === 'success' ? 2.4 : mode === 'submitting' ? 1.5 : 1
    if (mode === 'hover') {
      triggerLean('business')
      triggerLean('strategy')
      triggerEyeRaise('risk')
    }
    if (mode === 'email') {
      triggerEyeRaise('business') // reads carefully
      triggerLean('strategy') // curious
      triggerEyeRaise('risk') // verifies
      triggerNod('executive') // patiently watches
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // float + breathe + blink per character - deliberately NOT identical so
  // each personality reads distinctly even before anything else fires
  useFloat(() => refs.current.executive.floatEl, () => refs.current.executive.shadowEl, FLOAT_CFG.executive, motionEnabled, nodRefs.executive)
  useFloat(() => refs.current.business.floatEl, () => refs.current.business.shadowEl, FLOAT_CFG.business, motionEnabled, nodRefs.business)
  useFloat(() => refs.current.strategy.floatEl, () => refs.current.strategy.shadowEl, FLOAT_CFG.strategy, motionEnabled, nodRefs.strategy)
  useFloat(() => refs.current.risk.floatEl, () => refs.current.risk.shadowEl, FLOAT_CFG.risk, motionEnabled, nodRefs.risk)

  useBreathe(() => refs.current.executive.breatheEl, BREATHE_CFG.executive, motionEnabled, leanRefs.executive)
  useBreathe(() => refs.current.business.breatheEl, BREATHE_CFG.business, motionEnabled, leanRefs.business)
  useBreathe(() => refs.current.strategy.breatheEl, BREATHE_CFG.strategy, motionEnabled, leanRefs.strategy)
  useBreathe(() => refs.current.risk.breatheEl, BREATHE_CFG.risk, motionEnabled, leanRefs.risk)

  // CSS guards blink animation from applying to already-closed eyes (see
  // .eye-shape.eye-blinking:not(.eye-closed) in globals.css), so this can
  // run unconditionally without fighting privacy mode
  useBlink(() => refs.current.executive.eyeLShape, () => refs.current.executive.eyeRShape, motionEnabled, BLINK_CADENCE.executive)
  useBlink(() => refs.current.business.eyeLShape, () => refs.current.business.eyeRShape, motionEnabled, BLINK_CADENCE.business)
  useBlink(() => refs.current.strategy.eyeLShape, () => refs.current.strategy.eyeRShape, motionEnabled, BLINK_CADENCE.strategy)
  useBlink(() => refs.current.risk.eyeLShape, () => refs.current.risk.eyeRShape, motionEnabled, BLINK_CADENCE.risk)

  const characters = useMemo<DirectorCharacterConfig[]>(
    () => [
      {
        key: 'executive',
        anchor: [CHAR_LAYOUT.executive.cx, CHAR_LAYOUT.executive.cy],
        gazeRadius: 4.3,
        rotBound: 3,
        getEyeL: () => refs.current.executive.eyeLGaze,
        getEyeR: () => refs.current.executive.eyeRGaze,
        getRotEl: () => refs.current.executive.rotEl,
        raiseRef: raiseRefs.executive,
        override: () => (privacyOn ? [-2, -4.5, -3] : null), // looks upward, respectfully aside
      },
      {
        key: 'business',
        anchor: [CHAR_LAYOUT.business.cx, CHAR_LAYOUT.business.cy],
        gazeRadius: 2.9,
        rotBound: 3,
        getEyeL: () => refs.current.business.eyeLGaze,
        getEyeR: () => refs.current.business.eyeRGaze,
        getRotEl: () => refs.current.business.rotEl,
        raiseRef: raiseRefs.business,
        override: () => (isPeeking ? [0.5, -1.8, 0] : null), // curious upward peek
      },
      {
        key: 'strategy',
        anchor: [CHAR_LAYOUT.strategy.cx, CHAR_LAYOUT.strategy.cy],
        gazeRadius: 2.9,
        rotBound: 3,
        getEyeL: () => refs.current.strategy.eyeLGaze,
        getEyeR: () => refs.current.strategy.eyeRGaze,
        getRotEl: () => refs.current.strategy.rotEl,
        raiseRef: raiseRefs.strategy,
        override: () => null,
      },
      {
        key: 'risk',
        anchor: [CHAR_LAYOUT.risk.cx, CHAR_LAYOUT.risk.cy],
        gazeRadius: 2.6,
        rotBound: 3,
        getEyeL: () => refs.current.risk.eyeLGaze,
        getEyeR: () => refs.current.risk.eyeRGaze,
        getRotEl: () => refs.current.risk.rotEl,
        raiseRef: raiseRefs.risk,
        override: () => (privacyOn ? [-2.2, 1.8, 0] : null), // looks fully away, alert eyes stay open
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs/raiseRefs are stable identities from useRef
    [privacyOn, isPeeking]
  )

  const beats: DirectorBeats = {
    onNod: triggerNod,
    onLean: triggerLean,
    onEyeRaise: triggerEyeRaise,
    onSmileFlash: triggerSmileFlash,
    onGlowPulse: triggerGlowPulse,
    onParticleBoost: triggerParticleBoost,
    onNotice: triggerNotice,
  }
  useCompanionDirector(containerRef, characters, beats, () => modeRef.current, motionEnabled)

  // email typing - every few characters the team shows it's paying attention
  const lastEmailBeat = useRef(0)
  useEffect(() => {
    if (!motionEnabled) return
    if (emailLength > 0 && emailLength > lastEmailBeat.current + 2) {
      lastEmailBeat.current = emailLength
      triggerEyeRaise('business')
      if (Math.random() < 0.5) triggerLean('strategy')
      if (Math.random() < 0.35) triggerNod('executive')
    }
    if (emailLength === 0) lastEmailBeat.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailLength, motionEnabled])

  // password typing - privacy is still on, but every few keystrokes there's a
  // chance business briefly peeks, plus a soft shared glow tick either way
  const lastPasswordBeat = useRef(0)
  useEffect(() => {
    if (!motionEnabled) return
    if (privacyOn && !isPeeking && passwordLength > lastPasswordBeat.current + 3) {
      lastPasswordBeat.current = passwordLength
      triggerGlowPulse()
      if (Math.random() < 0.35) {
        setRandomPeek(true)
        scheduleTimeout(() => setRandomPeek(false), 450 + Math.random() * 350)
      }
    }
    if (passwordLength === 0) lastPasswordBeat.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps -- triggerGlowPulse only touches stable state setters/refs via scheduleTimeout; not chasing its identity
  }, [passwordLength, privacyOn, isPeeking, motionEnabled])

  const parallaxLayers = useMemo(
    () => [
      { getEl: () => refs.current.executive.parallaxEl, strength: 0.5 },
      { getEl: () => refs.current.business.parallaxEl, strength: 0.9 },
      { getEl: () => refs.current.strategy.parallaxEl, strength: 0.9 },
      { getEl: () => refs.current.risk.parallaxEl, strength: 1.1 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs is a stable identity from useRef
    []
  )
  useParallax(containerRef, parallaxLayers, motionEnabled)

  const particleItems = useMemo(
    () => [
      { getPathEl: () => pathRefs.current.business, getParticleEl: () => dotRefs.current.business, speed: 0.22 },
      { getPathEl: () => pathRefs.current.strategy, getParticleEl: () => dotRefs.current.strategy, speed: 0.19 },
      { getPathEl: () => pathRefs.current.risk, getParticleEl: () => dotRefs.current.risk, speed: 0.26 },
    ],
    []
  )
  useParticles(particleItems, particleSpeedMult, motionEnabled, submitBurst)

  const isHover = mode === 'hover'
  // glow levels trimmed ~15% across the board -- the glow radius itself grew
  // (see SceneCharacter's 1.35 -> 1.4 multiplier) now that bodies are bigger,
  // so intensity comes down to keep the glow soft instead of compounding
  // into extra bloom
  const pulseBoost = teamPulse ? 0.07 : 0
  const emailBonus = emailValid ? 0.05 : 0
  // progressive trust: the team's glow baseline climbs gradually the longer
  // the password gets (capped at 20 chars)
  const trustLevel = privacyOn ? Math.min(passwordLength / 20, 1) : 0
  const trustBonus = trustLevel * 0.12

  // executive is the visual hub and stays brightest at rest; business/strategy/risk
  // keep a low ambient baseline so only executive, the neural links, and genuinely
  // important state changes (success/error/privacy trust) draw the eye
  const glow: Record<CharacterKey, number> = {
    executive: booted.executive ? (mode === 'success' ? 0.58 : privacyOn ? 0.14 + trustBonus : isHover ? 0.36 : 0.34) + pulseBoost : 0,
    business: booted.business
      ? (mode === 'success' ? 0.51 : privacyOn ? 0.09 + trustBonus * 0.6 : isHover ? 0.14 : 0.1) + pulseBoost * 0.6 + emailBonus
      : 0,
    strategy: booted.strategy
      ? (mode === 'success' ? 0.51 : privacyOn ? 0.09 + trustBonus * 0.6 : isHover ? 0.14 : 0.1) + pulseBoost * 0.6
      : 0,
    risk: booted.risk
      ? (mode === 'success' ? 0.51 : riskAlert ? 0.47 : privacyOn ? 0.1 + trustBonus * 0.6 : isHover ? 0.14 : 0.1) + pulseBoost * 0.6
      : 0,
  }

  const mouth: Record<CharacterKey, MouthState> = {
    executive: mode === 'success' ? 'smile' : mode === 'error' ? 'frown' : 'none',
    business: privacyOn ? 'smile-soft' : flashSmile.business || mode === 'success' ? 'smile' : mode === 'error' ? 'frown' : 'none',
    strategy: flashSmile.strategy || mode === 'success' ? 'smile' : mode === 'error' ? 'frown' : 'none',
    risk: flashSmile.risk || mode === 'success' ? 'smile' : mode === 'error' ? 'frown' : 'none',
  }

  // per-eye state - this is what makes the peek possible (one eye differs
  // from the other) instead of a single all-or-nothing "closed" flag
  const eyes: Record<CharacterKey, { L: EyeState; R: EyeState }> = {
    executive: !booted.executive || privacyOn ? { L: 'closed', R: 'closed' } : { L: 'open', R: 'open' },
    business:
      !booted.business || privacyOn
        ? { L: 'closed', R: booted.business && (isPeeking || randomPeek) ? 'peek' : 'closed' }
        : { L: 'open', R: 'open' },
    strategy: !booted.strategy || privacyOn ? { L: 'closed', R: 'closed' } : { L: 'open', R: 'open' },
    risk: !booted.risk ? { L: 'closed', R: 'closed' } : { L: 'open', R: 'open' }, // risk stays alert once awake
  }

  const capsLockWarning = capsLockOn && focusedField === 'password'

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[520/380] h-[clamp(260px,56vh,620px)] overflow-visible${sceneShake ? ' scene-shake' : ''}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 520 380" className="h-full w-full">
        <defs>
          <filter id="coreGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <linearGradient id="coreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3F1EC" />
            <stop offset="100%" stopColor="#DAD7CC" />
          </linearGradient>
          <linearGradient id="linkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.28" />
          </linearGradient>
        </defs>

        <path ref={(el) => { pathRefs.current.business = el }} d="M 152,213 Q 172,178 216,158" fill="none" stroke="url(#linkGrad)" strokeWidth="1.5" />
        <path ref={(el) => { pathRefs.current.strategy = el }} d="M 368,213 Q 350,178 304,158" fill="none" stroke="url(#linkGrad)" strokeWidth="1.5" />
        <path ref={(el) => { pathRefs.current.risk = el }} d="M 260,250 Q 253,214 260,178" fill="none" stroke="url(#linkGrad)" strokeWidth="1.5" />
        <circle ref={(el) => { dotRefs.current.business = el }} r="3" fill={ACCENT.business} filter="url(#coreGlow)" />
        <circle ref={(el) => { dotRefs.current.strategy = el }} r="3" fill={ACCENT.strategy} filter="url(#coreGlow)" />
        <circle ref={(el) => { dotRefs.current.risk = el }} r="3" fill={ACCENT.risk} filter="url(#coreGlow)" />

        {successBurst > 0 && (
          <circle
            key={successBurst}
            cx={CHAR_LAYOUT.executive.cx}
            cy={CHAR_LAYOUT.executive.cy}
            r="6"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            className="success-burst-ring"
          />
        )}

        <SceneCharacter store={refs.current.business} {...CHAR_LAYOUT.business} accent={ACCENT.business} eyeL={eyes.business.L} eyeR={eyes.business.R} mouth={mouth.business} glowLevel={glow.business}>
          <text y={CHAR_LAYOUT.business.half + 23} textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="1.5" fill="#EDEBE4" fontFamily="Inter, sans-serif" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            BUSINESS
          </text>
        </SceneCharacter>

        <SceneCharacter store={refs.current.strategy} {...CHAR_LAYOUT.strategy} accent={ACCENT.strategy} eyeL={eyes.strategy.L} eyeR={eyes.strategy.R} mouth={mouth.strategy} glowLevel={glow.strategy}>
          <text y={CHAR_LAYOUT.strategy.half + 23} textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="1.5" fill="#EDEBE4" fontFamily="Inter, sans-serif" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            STRATEGY
          </text>
        </SceneCharacter>

        <SceneCharacter store={refs.current.risk} {...CHAR_LAYOUT.risk} accent={ACCENT.risk} eyeL={eyes.risk.L} eyeR={eyes.risk.R} mouth={mouth.risk} glowLevel={glow.risk}>
          <g
            className={`shield${privacyOn || capsLockWarning || riskAlert ? ' shield-on' : ''}${capsLockWarning ? ' shield-warning' : ''}${
              riskAlert ? ' shield-alert' : ''
            }`}
          >
            <path
              d={`M -8,${-CHAR_LAYOUT.risk.half - 10} q 8,-6 16,0 v9 q -8,9 -16,0 z`}
              fill="none"
              stroke={riskAlert ? '#F0665A' : capsLockWarning ? '#E3A25E' : ACCENT.risk}
              strokeWidth="1.4"
            />
          </g>
          <text y={CHAR_LAYOUT.risk.half + 23} textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="1.5" fill="#EDEBE4" fontFamily="Inter, sans-serif" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            RISK
          </text>
        </SceneCharacter>

        <SceneCharacter store={refs.current.executive} {...CHAR_LAYOUT.executive} accent={ACCENT.executive} eyeL={eyes.executive.L} eyeR={eyes.executive.R} mouth={mouth.executive} glowLevel={glow.executive}>
          <circle r={CHAR_LAYOUT.executive.half * 1.55} fill="none" stroke={ACCENT.executive} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 6" className="exec-ring" />
          <text y={CHAR_LAYOUT.executive.half + 25} textAnchor="middle" fontSize="11" fontWeight="600" letterSpacing="1.8" fill="#F5F1E6" fontFamily="Inter, sans-serif" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            EXECUTIVE
          </text>
        </SceneCharacter>

        {(['business', 'strategy', 'risk', 'executive'] as CharacterKey[]).map((k, i) => {
          const { cx, cy, half } = CHAR_LAYOUT[k]
          return (
            <g
              key={k}
              transform={`translate(${cx + half * 0.72},${cy - half * 0.72})`}
              opacity={mode === 'success' ? 1 : 0}
              style={{ transition: `opacity 0.4s ease ${i * 0.12}s, transform 0.4s ease ${i * 0.12}s` }}
            >
              <circle r="9" fill="#151610" stroke="#4ADE80" strokeWidth="1.4" />
              <path d="M -3.5,0 L -1,3 L 4,-3.5" stroke="#4ADE80" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default MissionAIScene
