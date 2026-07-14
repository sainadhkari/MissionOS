export type AgentShape = 'crystal-cube' | 'gem' | 'hexagon' | 'halo-orb'
export type PrivacyStyle = 'look-away' | 'dim' | 'shield' | 'close-eyes'

export interface AgentConfig {
  id: string
  label: string
  shape: AgentShape
  privacyStyle: PrivacyStyle
  gradient: string
  glowColor: string
  size: number
  /** Center position as a 0-100 percentage of the scene box — drives both DOM placement and eye-direction math. */
  centerX: number
  centerY: number
  floatDuration: number
  floatDelay: number
  blinkOffset: number
  leansForward?: boolean
  tiltsOnAlert?: boolean
  smiles?: boolean
  celebrationEmoji: string
  celebrationLabel: string
}

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'business-intelligence',
    label: 'Business Intelligence Agent',
    shape: 'crystal-cube',
    privacyStyle: 'look-away',
    gradient: 'from-sky-400/90 to-blue-600/90',
    glowColor: '56,189,248',
    size: 74,
    centerX: 50,
    centerY: 84,
    floatDuration: 7,
    floatDelay: 0,
    blinkOffset: 0.2,
    celebrationEmoji: '📊',
    celebrationLabel: 'Business ready',
  },
  {
    id: 'strategy',
    label: 'Strategy Agent',
    shape: 'gem',
    privacyStyle: 'dim',
    gradient: 'from-indigo-400/90 to-indigo-600/90',
    glowColor: '129,140,248',
    size: 66,
    centerX: 24,
    centerY: 56,
    floatDuration: 6.4,
    floatDelay: 0.6,
    blinkOffset: 0.8,
    leansForward: true,
    celebrationEmoji: '🚀',
    celebrationLabel: 'Strategy ready',
  },
  {
    id: 'risk-intelligence',
    label: 'Risk Intelligence Agent',
    shape: 'hexagon',
    privacyStyle: 'shield',
    gradient: 'from-amber-400/90 to-orange-600/85',
    glowColor: '251,191,36',
    size: 62,
    centerX: 76,
    centerY: 56,
    floatDuration: 5.6,
    floatDelay: 1.1,
    blinkOffset: 1.4,
    tiltsOnAlert: true,
    celebrationEmoji: '🛡',
    celebrationLabel: 'Risk validated',
  },
  {
    id: 'executive-decision',
    label: 'Executive Decision Agent',
    shape: 'halo-orb',
    privacyStyle: 'close-eyes',
    gradient: 'from-white/50 to-primary-300/70',
    glowColor: '255,255,255',
    size: 108,
    centerX: 50,
    centerY: 24,
    floatDuration: 7.6,
    floatDelay: 1.6,
    blinkOffset: 2,
    smiles: true,
    celebrationEmoji: '👔',
    celebrationLabel: 'Executive approved',
  },
]
