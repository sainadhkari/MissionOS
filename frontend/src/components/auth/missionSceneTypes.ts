export type CharacterKey = 'executive' | 'business' | 'strategy' | 'risk'

export type SceneMode = 'idle' | 'hover' | 'email' | 'password' | 'reveal' | 'submitting' | 'success' | 'error'

export type EyeState = 'open' | 'closed' | 'peek'
export type MouthState = 'smile' | 'smile-soft' | 'frown' | 'none'

export interface CharacterRefs {
  shadowEl: SVGEllipseElement | null
  parallaxEl: SVGGElement | null
  floatEl: SVGGElement | null
  rotEl: SVGGElement | null
  breatheEl: SVGGElement | null
  eyeLGaze: SVGGElement | null
  eyeRGaze: SVGGElement | null
  eyeLShape: SVGRectElement | null
  eyeRShape: SVGRectElement | null
}

export interface DirectorCharacterConfig {
  key: CharacterKey
  anchor: [number, number]
  gazeRadius: number
  rotBound: number
  getEyeL: () => SVGGElement | null
  getEyeR: () => SVGGElement | null
  getRotEl: () => SVGGElement | null
  raiseRef: { current: number }
  override: () => [number, number, number?] | null
}

export interface DirectorBeats {
  onNod: (key: CharacterKey) => void
  onLean: (key: CharacterKey) => void
  onEyeRaise: (key: CharacterKey) => void
  onSmileFlash: (key: CharacterKey) => void
  onGlowPulse: () => void
  onParticleBoost: () => void
  onNotice?: () => void
}
