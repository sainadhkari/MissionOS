import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { DirectorBeats, DirectorCharacterConfig, SceneMode } from './missionSceneTypes'

/**
 * Each hook owns exactly one transform-writer so nested <g> groups never fight
 * over the same attribute. Everything writes via DOM refs directly (no React
 * state) so continuous motion never triggers re-renders.
 */

interface FloatConfig {
  amplitude: number
  speed: number
  phase: number
}

// paired with the shadow so it reacts inversely to lift
export function useFloat(
  getGroupEl: () => SVGGElement | null,
  getShadowEl: () => SVGEllipseElement | null,
  { amplitude, speed, phase }: FloatConfig,
  enabled: boolean,
  pulseRef?: { current: number }
) {
  useEffect(() => {
    if (!enabled) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      let y = Math.sin(t * speed + phase) * amplitude
      if (pulseRef) {
        y += pulseRef.current
        pulseRef.current *= 0.84
      }
      const g = getGroupEl()
      if (g) g.setAttribute('transform', `translate(0,${y.toFixed(2)})`)
      const s = getShadowEl()
      if (s) {
        const lift = (y + amplitude) / (amplitude * 2)
        s.setAttribute('opacity', (0.28 - lift * 0.14).toFixed(2))
        s.setAttribute('transform', `scale(${(1 - lift * 0.22).toFixed(2)},1)`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config/getters are stable per caller; restarting on every render would reset the animation clock
  }, [enabled])
}

interface BreatheConfig {
  min: number
  max: number
  speed: number
  phase: number
}

export function useBreathe(
  getGroupEl: () => SVGGElement | null,
  { min, max, speed, phase }: BreatheConfig,
  enabled: boolean,
  pulseRef?: { current: number }
) {
  useEffect(() => {
    if (!enabled) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      let s = min + ((Math.sin(t * speed + phase) + 1) / 2) * (max - min)
      if (pulseRef) {
        s += pulseRef.current
        pulseRef.current *= 0.82
      }
      const g = getGroupEl()
      if (g) g.setAttribute('transform', `scale(${s.toFixed(4)})`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- config/getters are stable per caller; restarting on every render would reset the animation clock
  }, [enabled])
}

interface BlinkCadence {
  min: number
  max: number
}

// random, independent, occasional stagger between eyes; cadence lets each
// personality have a different rhythm
export function useBlink(
  getLeftEl: () => SVGRectElement | null,
  getRightEl: () => SVGRectElement | null,
  enabled: boolean,
  cadence: BlinkCadence = { min: 3000, max: 7000 }
) {
  useEffect(() => {
    if (!enabled) return
    let timeout: ReturnType<typeof setTimeout>
    const fire = (el: SVGRectElement | null, long: boolean) => {
      if (!el) return
      el.classList.remove('eye-blinking', 'eye-blinking-long')
      void el.getBoundingClientRect()
      el.classList.add(long ? 'eye-blinking-long' : 'eye-blinking')
    }
    const doBlink = () => {
      const long = Math.random() < 0.15
      const stagger = Math.random() < 0.2
      fire(getLeftEl(), long)
      if (stagger) setTimeout(() => fire(getRightEl(), long), 35 + Math.random() * 25)
      else fire(getRightEl(), long)
    }
    const schedule = () => {
      const delay = cadence.min + Math.random() * (cadence.max - cadence.min)
      timeout = setTimeout(() => {
        doBlink()
        if (Math.random() < 0.12) {
          setTimeout(doBlink, 180 + Math.random() * 60)
        }
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getLeftEl/getRightEl are stable per caller; restarting on every render would reset the blink schedule
  }, [enabled, cadence.min, cadence.max])
}

interface CharDirectorState {
  curX: number
  curY: number
  curRot: number
  targetX: number
  targetY: number
  targetRot: number
  idleX: number
  idleY: number
  idleRot: number
}

/**
 * Gaze (cursor tracking + idle looking) + micro head rotation + per-personality
 * idle acting + the team attention-chain that makes the four characters
 * occasionally notice one another instead of acting alone.
 *
 * Priority per frame, highest wins: explicit mode override (e.g. password
 * privacy) > attention-chain target (team noticing each other) > live cursor
 * position > this character's own idle-personality behavior.
 */
export function useCompanionDirector(
  containerRef: RefObject<HTMLDivElement | null>,
  characters: DirectorCharacterConfig[],
  beats: DirectorBeats,
  getMode: () => SceneMode,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const state: Record<string, CharDirectorState> = {}
    characters.forEach((c) => {
      state[c.key] = { curX: 0, curY: 0, curRot: 0, targetX: 0, targetY: 0, targetRot: 0, idleX: 0, idleY: 0, idleRot: 0 }
    })
    const attention: Record<string, [number, number, number?] | null> = {
      business: null,
      strategy: null,
      risk: null,
      executive: null,
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    const setIdle = (key: string, x: number, y: number, rot: number) => {
      const s = state[key]
      s.idleX = x
      s.idleY = y
      s.idleRot = rot
    }

    // business: calm, logical - small side-to-side "processing" glances, occasional nod
    const loopBusiness = () => {
      const dir = Math.random() < 0.5 ? -1 : 1
      setIdle('business', dir * 1.6, 0.5, dir * 0.7)
      if (Math.random() < 0.3) beats.onNod('business')
      timers.push(setTimeout(loopBusiness, 4200 + Math.random() * 3000))
    }
    // strategy: curious dreamer - looks up/around, tilts, flashes a small smile
    const loopStrategy = () => {
      const looks: [number, number, number][] = [
        [0, -2.3, 2.4],
        [-2.1, -0.6, -2.8],
        [2.1, -0.8, 3],
        [0.5, -1.8, -2],
      ]
      const pick = looks[Math.floor(Math.random() * looks.length)]
      setIdle('strategy', pick[0], pick[1], pick[2])
      if (Math.random() < 0.4) beats.onSmileFlash('strategy')
      if (Math.random() < 0.25) beats.onLean('strategy')
      timers.push(setTimeout(loopStrategy, 3200 + Math.random() * 2400))
    }
    // risk: guardian - scans left, then right, then back to center
    const loopRisk = () => {
      setIdle('risk', -2.1, 0.2, 0)
      const t1 = setTimeout(() => {
        setIdle('risk', 2.1, 0.2, 0)
        beats.onEyeRaise('risk')
        const t2 = setTimeout(() => setIdle('risk', 0, 0, 0), 700)
        timers.push(t2)
      }, 700)
      timers.push(t1)
      timers.push(setTimeout(loopRisk, 3800 + Math.random() * 2400))
    }
    // executive: still and composed - rare, deliberate glances toward teammates
    const loopExecutive = () => {
      const dirs: [number, number, number][] = [
        [-1.5, 0.7, -1.1],
        [1.5, 0.7, 1.1],
        [0, 1, 0],
      ]
      const pick = dirs[Math.floor(Math.random() * dirs.length)]
      setIdle('executive', pick[0], pick[1], pick[2])
      timers.push(setTimeout(() => setIdle('executive', 0, 0, 0), 2400))
      timers.push(setTimeout(loopExecutive, 9000 + Math.random() * 5000))
    }
    timers.push(setTimeout(loopBusiness, 1400))
    timers.push(setTimeout(loopStrategy, 900))
    timers.push(setTimeout(loopRisk, 2000))
    timers.push(setTimeout(loopExecutive, 3500))

    // team attention chain: they notice each other every 15-25s
    const runChain = () => {
      if (getMode() === 'idle') {
        attention.business = [1.9, 0.3, 1.7]
        beats.onGlowPulse()
        const t1 = setTimeout(() => {
          attention.strategy = [-1.7, 0.3, -1.5]
          beats.onNod('strategy')
        }, 450)
        const t2 = setTimeout(() => {
          attention.strategy = [0.2, 1.7, 0.9]
        }, 950)
        const t3 = setTimeout(() => {
          attention.risk = [-0.2, -1.6, 0]
          beats.onParticleBoost()
        }, 1350)
        const t4 = setTimeout(() => {
          attention.executive = [0, 1.4, 0]
          beats.onNod('executive')
        }, 1850)
        const t5 = setTimeout(() => {
          attention.business = null
          attention.strategy = null
          attention.risk = null
          attention.executive = null
        }, 2700)
        timers.push(t1, t2, t3, t4, t5)
      }
      timers.push(setTimeout(runChain, 15000 + Math.random() * 10000))
    }
    timers.push(setTimeout(runChain, 7000 + Math.random() * 5000))

    // live cursor tracking (highest ambient priority)
    let pointer: { x: number; y: number } | null = null
    let hoverStarted = false
    const onMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect()
      pointer = {
        x: ((e.clientX - r.left) / r.width) * 2 - 1,
        y: ((e.clientY - r.top) / r.height) * 2 - 1,
      }
      if (!hoverStarted) {
        hoverStarted = true
        beats.onNotice?.()
      }
    }
    const onLeave = () => {
      pointer = null
      hoverStarted = false
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)

    let raf: number
    const tick = () => {
      characters.forEach((c) => {
        const s = state[c.key]
        const override = c.override()
        const attn = attention[c.key]
        if (override) {
          s.targetX = override[0]
          s.targetY = override[1]
          s.targetRot = override[2] ?? 0
        } else if (attn) {
          s.targetX = attn[0]
          s.targetY = attn[1]
          s.targetRot = attn[2] ?? 0
        } else if (pointer) {
          const dx = pointer.x * c.gazeRadius * 1.6 - c.anchor[0] * 0.002
          const dy = pointer.y * c.gazeRadius * 0.9
          const len = Math.hypot(dx, dy) || 1
          const clamped = Math.min(len, c.gazeRadius)
          s.targetX = (dx / len) * clamped
          s.targetY = (dy / len) * clamped
          s.targetRot = Math.max(-c.rotBound, Math.min(c.rotBound, pointer.x * c.rotBound))
        } else {
          s.targetX = s.idleX
          s.targetY = s.idleY
          s.targetRot = s.idleRot
        }
        s.curX += (s.targetX - s.curX) * 0.08
        s.curY += (s.targetY - s.curY) * 0.08
        s.curRot += (s.targetRot - s.curRot) * 0.06

        const raise = c.raiseRef.current
        c.raiseRef.current *= 0.85
        const eyeL = c.getEyeL()
        const eyeR = c.getEyeR()
        if (eyeL) eyeL.setAttribute('transform', `translate(${s.curX.toFixed(2)},${(s.curY - raise).toFixed(2)})`)
        if (eyeR) eyeR.setAttribute('transform', `translate(${s.curX.toFixed(2)},${(s.curY - raise).toFixed(2)})`)
        const rotEl = c.getRotEl()
        if (rotEl) rotEl.setAttribute('transform', `rotate(${s.curRot.toFixed(2)})`)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- beats/containerRef/getMode all read through stable refs, so the closures captured here stay valid across renders
  }, [enabled, characters])
}

interface ParallaxLayer {
  getEl: () => SVGGElement | null
  strength: number
}

// whole-scene depth response to cursor, max 8px
export function useParallax(containerRef: RefObject<HTMLDivElement | null>, layers: ParallaxLayer[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    let target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    const onMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect()
      target = {
        x: (((e.clientX - r.left) / r.width) * 2 - 1) * 8,
        y: (((e.clientY - r.top) / r.height) * 2 - 1) * 8,
      }
    }
    const onLeave = () => {
      target = { x: 0, y: 0 }
    }
    container.addEventListener('mousemove', onMove)
    container.addEventListener('mouseleave', onLeave)
    let raf: number
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.06
      cur.y += (target.y - cur.y) * 0.06
      layers.forEach(({ getEl, strength }) => {
        const el = getEl()
        if (el) el.setAttribute('transform', `translate(${(cur.x * strength).toFixed(2)},${(cur.y * strength).toFixed(2)})`)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mouseleave', onLeave)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef is a stable ref; restarting on every render would reset the parallax easing
  }, [enabled, layers])
}

interface ParticleItem {
  getPathEl: () => SVGPathElement | null
  getParticleEl: () => SVGCircleElement | null
  speed: number
}

// neural connection particles flowing along each path
export function useParticles(
  items: ParticleItem[],
  speedMultRef: { current: number },
  enabled: boolean,
  restartSignal: number
) {
  useEffect(() => {
    if (!enabled) return
    let raf: number
    const start = performance.now() // re-captured whenever restartSignal changes
    const tick = (now: number) => {
      const t = (now - start) / 1000
      items.forEach(({ getPathEl, getParticleEl, speed }) => {
        const path = getPathEl()
        const dot = getParticleEl()
        if (!path || !dot) return
        const total = path.getTotalLength()
        const mult = speedMultRef.current || 1
        const frac = (t * speed * mult) % 1
        const pt = path.getPointAtLength(frac * total)
        dot.setAttribute('cx', pt.x.toFixed(2))
        dot.setAttribute('cy', pt.y.toFixed(2))
        dot.setAttribute('opacity', frac < 0.06 || frac > 0.94 ? '0' : '0.9')
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items/speedMultRef are stable per caller; restartSignal is the intentional trigger to reset the clock
  }, [enabled, restartSignal])
}
