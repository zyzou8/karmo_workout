'use client'

import { ReactNode } from 'react'
import { MuscleGroup, muscleLoadLevel } from '@/lib/bodySummary'

export type BodyView = 'front' | 'back'

/** Heat colors for load levels 1–4 (level 0 uses the silhouette color). */
export const LOAD_COLORS = ['', '#38bdf8', '#22c55e', '#facc15', '#f43f5e'] as const

export interface BodyPin {
  n: number
  x: number
  y: number
  color: string
  label: string
}

interface Shape {
  muscle?: MuscleGroup
  el: ReactNode
}

/**
 * Stylized figure on a 200×420 canvas. Shapes are drawn for the figure's left half (x < 100)
 * and mirrored; `center` shapes are drawn once.
 */
const SILHOUETTE: ReactNode[] = [
  <ellipse key="head" cx="100" cy="32" rx="17" ry="21" />,
  <rect key="neck" x="91" y="48" width="18" height="16" rx="4" />,
  <path key="torso" d="M68 66 Q100 58 132 66 L140 92 Q131 140 125 192 L75 192 Q69 140 60 92 Z" />,
  <path key="pelvis" d="M75 186 L125 186 L127 214 Q100 222 73 214 Z" />,
]
const SILHOUETTE_HALF: ReactNode[] = [
  <ellipse key="upperArm" cx="54" cy="108" rx="11" ry="26" transform="rotate(10 54 108)" />,
  <ellipse key="forearm" cx="46" cy="155" rx="9" ry="24" transform="rotate(12 46 155)" />,
  <ellipse key="hand" cx="40" cy="186" rx="7" ry="9" />,
  <ellipse key="thigh" cx="84" cy="248" rx="17" ry="46" transform="rotate(-3 84 248)" />,
  <ellipse key="shin" cx="85" cy="336" rx="12" ry="40" />,
  <ellipse key="foot" cx="84" cy="384" rx="10" ry="7" />,
]

const FRONT_HALF: Shape[] = [
  { muscle: 'shoulders', el: <ellipse cx="63" cy="80" rx="13" ry="12" /> },
  { muscle: 'chest', el: <path d="M98 74 Q82 68 72 78 Q67 96 79 104 Q92 108 98 101 Z" /> },
  { muscle: 'biceps', el: <ellipse cx="54" cy="110" rx="7.5" ry="17" transform="rotate(10 54 110)" /> },
  { muscle: 'forearms', el: <ellipse cx="46" cy="154" rx="6.5" ry="19" transform="rotate(12 46 154)" /> },
  { muscle: 'abs', el: <path d="M84 112 Q76 140 79 172 L86 176 L86 112 Z" /> },
  { muscle: 'quads', el: <path d="M72 214 Q68 250 76 286 Q84 294 92 286 Q98 250 96 216 Q84 210 72 214 Z" /> },
  { muscle: 'calves', el: <ellipse cx="84" cy="334" rx="7" ry="28" /> },
]
const FRONT_CENTER: Shape[] = [
  { muscle: 'abs', el: <rect x="89" y="110" width="22" height="66" rx="7" /> },
]

const BACK_HALF: Shape[] = [
  { muscle: 'shoulders', el: <ellipse cx="63" cy="80" rx="13" ry="12" /> },
  { muscle: 'lats', el: <path d="M74 92 Q66 124 82 160 L97 150 L97 104 Z" /> },
  { muscle: 'triceps', el: <ellipse cx="54" cy="110" rx="7.5" ry="17" transform="rotate(10 54 110)" /> },
  { muscle: 'forearms', el: <ellipse cx="46" cy="154" rx="6.5" ry="19" transform="rotate(12 46 154)" /> },
  { muscle: 'glutes', el: <ellipse cx="87" cy="204" rx="13" ry="14" /> },
  { muscle: 'hamstrings', el: <path d="M73 224 Q70 256 77 288 Q85 294 92 288 Q97 256 96 224 Q85 218 73 224 Z" /> },
  { muscle: 'calves', el: <ellipse cx="84" cy="332" rx="10" ry="27" /> },
]
const BACK_CENTER: Shape[] = [
  { muscle: 'traps', el: <path d="M100 56 L76 72 Q90 80 100 118 Q110 80 124 72 Z" /> },
  { muscle: 'lowerBack', el: <rect x="88" y="152" width="24" height="32" rx="6" /> },
]

interface Props {
  view: BodyView
  muscles: Partial<Record<MuscleGroup, number>>
  muscleLabel: (m: MuscleGroup) => string
  selected?: MuscleGroup | null
  onSelect?: (m: MuscleGroup) => void
  pins?: BodyPin[]
  className?: string
}

export function BodyModel({ view, muscles, muscleLabel, selected, onSelect, pins = [], className = '' }: Props) {
  const half = view === 'front' ? FRONT_HALF : BACK_HALF
  const center = view === 'front' ? FRONT_CENTER : BACK_CENTER

  const renderShape = (shape: Shape, key: string) => {
    if (!shape.muscle) return null
    const m = shape.muscle
    const sets = muscles[m] ?? 0
    const level = muscleLoadLevel(sets)
    const isSelected = selected === m
    return (
      <g
        key={key}
        onClick={onSelect ? () => onSelect(m) : undefined}
        className={`${onSelect ? 'cursor-pointer' : ''} transition-opacity`}
        style={{ fill: level ? LOAD_COLORS[level] : 'var(--body-muscle)', fillOpacity: level ? 0.85 : 1 }}
        stroke={isSelected ? 'var(--body-selected)' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
      >
        <title>{`${muscleLabel(m)} · ${sets}`}</title>
        {shape.el}
      </g>
    )
  }

  return (
    <svg viewBox="0 0 200 400" className={className} role="img" aria-label={view}>
      <g style={{ fill: 'var(--body-base)' }}>
        {SILHOUETTE}
        {SILHOUETTE_HALF}
        <g transform="translate(200 0) scale(-1 1)">{SILHOUETTE_HALF}</g>
      </g>
      {half.map((s, i) => renderShape(s, `l${i}`))}
      <g transform="translate(200 0) scale(-1 1)">{half.map((s, i) => renderShape(s, `r${i}`))}</g>
      {center.map((s, i) => renderShape(s, `c${i}`))}
      {pins.map(pin => (
        <g key={pin.n} aria-label={pin.label} className="pointer-events-none">
          <circle cx={pin.x} cy={pin.y} r="8.5" fill={pin.color} stroke="var(--body-pin-ring)" strokeWidth="2" />
          <text x={pin.x} y={pin.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{pin.n}</text>
        </g>
      ))}
    </svg>
  )
}
