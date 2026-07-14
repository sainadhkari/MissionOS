/* eslint-disable react-hooks/immutability -- ref callbacks below populate a mutable `store` object
   (see missionSceneTypes.ts CharacterRefs) that missionSceneHooks.ts reads/writes imperatively on
   every animation frame; see missionSceneHooks.ts for the full rationale. */
import type { ReactNode } from 'react'
import type { CharacterRefs, EyeState, MouthState } from './missionSceneTypes'

interface SceneCharacterProps {
  store: CharacterRefs
  cx: number
  cy: number
  half: number
  accent: string
  eyeL?: EyeState
  eyeR?: EyeState
  mouth: MouthState
  glowLevel: number
  children?: ReactNode
}

function eyeClass(state: EyeState) {
  if (state === 'closed') return ' eye-closed'
  if (state === 'peek') return ' eye-peek'
  return ''
}

function mouthPath(mouth: MouthState, half: number, mouthY: number) {
  switch (mouth) {
    case 'smile':
      return `M ${-half * 0.24},${mouthY} Q 0,${mouthY + half * 0.18} ${half * 0.24},${mouthY}`
    case 'smile-soft':
      return `M ${-half * 0.18},${mouthY} Q 0,${mouthY + half * 0.09} ${half * 0.18},${mouthY}`
    case 'frown':
      return `M ${-half * 0.22},${mouthY + half * 0.06} Q 0,${mouthY - half * 0.08} ${half * 0.22},${mouthY + half * 0.06}`
    default:
      return `M 0,${mouthY} L 0,${mouthY}`
  }
}

// Same silhouette for every companion - a rounded square - differentiated by
// size and accent color. Personality lives entirely in the motion (float,
// breathe, blink cadence, idle behavior) driven by the hooks in
// missionSceneHooks.ts, not in the body shape.
function SceneCharacter({ store, cx, cy, half, accent, eyeL = 'open', eyeR = 'open', mouth, glowLevel, children }: SceneCharacterProps) {
  const eyeOffsetX = half * 0.34
  const eyeOffsetY = -half * 0.16
  const eyeW = half * 0.22
  const eyeH = half * 0.32
  const mouthY = half * 0.42

  return (
    <g transform={`translate(${cx},${cy})`}>
      <ellipse ref={(el) => { store.shadowEl = el }} cx="0" cy={half + half * 0.35} rx={half * 0.75} ry={half * 0.16} fill="#000" opacity="0.22" />

      <g ref={(el) => { store.parallaxEl = el }}>
        <g ref={(el) => { store.floatEl = el }}>
          <g ref={(el) => { store.rotEl = el }}>
            <g ref={(el) => { store.breatheEl = el }}>
              <circle r={half * 1.4} fill={accent} opacity={glowLevel} filter="url(#coreGlow)" style={{ transition: 'opacity 0.6s ease' }} />
              <rect x={-half} y={-half} width={half * 2} height={half * 2} rx={half * 0.32} fill="url(#coreFill)" stroke={accent} strokeOpacity="0.55" strokeWidth="1.5" />
              <g ref={(el) => { store.eyeLGaze = el }} transform="translate(0,0)">
                <rect
                  ref={(el) => { store.eyeLShape = el }}
                  className={`eye-shape${eyeClass(eyeL)}`}
                  x={-eyeOffsetX - eyeW / 2}
                  y={eyeOffsetY - eyeH / 2}
                  width={eyeW}
                  height={eyeH}
                  rx={eyeW / 2}
                  fill="#12131A"
                />
              </g>
              <g ref={(el) => { store.eyeRGaze = el }} transform="translate(0,0)">
                <rect
                  ref={(el) => { store.eyeRShape = el }}
                  className={`eye-shape${eyeClass(eyeR)}`}
                  x={eyeOffsetX - eyeW / 2}
                  y={eyeOffsetY - eyeH / 2}
                  width={eyeW}
                  height={eyeH}
                  rx={eyeW / 2}
                  fill="#12131A"
                />
              </g>
              <path
                d={mouthPath(mouth, half, mouthY)}
                stroke="#12131A"
                strokeWidth={Math.max(1.6, half * 0.045)}
                strokeLinecap="round"
                fill="none"
                opacity={mouth === 'none' ? 0 : 0.85}
                style={{ transition: 'opacity 0.4s ease' }}
              />
            </g>
          </g>
          {/* labels/glyphs float with the character but deliberately sit
              outside the rotate/breathe chain, so captions stay upright
              instead of tilting with the head */}
          {children}
        </g>
      </g>
    </g>
  )
}

export default SceneCharacter
