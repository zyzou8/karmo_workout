import React from 'react'
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg'
import { MuscleGroup, muscleLoadLevel } from '../lib/bodySummaryCore'
import { useTheme } from '../lib/theme/ThemeContext'

export type BodyView = 'front' | 'back'

/** Heat colors for load levels 1–4 (level 0 uses the silhouette color). Matches the web app. */
export const LOAD_COLORS = ['', '#38bdf8', '#22c55e', '#facc15', '#f43f5e'] as const

export interface BodyPin {
  n: number
  x: number
  y: number
  color: string
}

type ShapeDef =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { kind: 'path'; d: string }

interface Shape {
  muscle: MuscleGroup
  def: ShapeDef
}

// Same 200×400 geometry as the web BodyModel: left-half shapes are mirrored, center shapes drawn once.
const SILHOUETTE: ShapeDef[] = [
  { kind: 'ellipse', cx: 100, cy: 32, rx: 17, ry: 21 },
  { kind: 'rect', x: 91, y: 48, width: 18, height: 16, rx: 4 },
  { kind: 'path', d: 'M68 66 Q100 58 132 66 L140 92 Q131 140 125 192 L75 192 Q69 140 60 92 Z' },
  { kind: 'path', d: 'M75 186 L125 186 L127 214 Q100 222 73 214 Z' },
]
const SILHOUETTE_HALF: ShapeDef[] = [
  { kind: 'ellipse', cx: 54, cy: 108, rx: 11, ry: 26, rotate: 10 },
  { kind: 'ellipse', cx: 46, cy: 155, rx: 9, ry: 24, rotate: 12 },
  { kind: 'ellipse', cx: 40, cy: 186, rx: 7, ry: 9 },
  { kind: 'ellipse', cx: 84, cy: 248, rx: 17, ry: 46, rotate: -3 },
  { kind: 'ellipse', cx: 85, cy: 336, rx: 12, ry: 40 },
  { kind: 'ellipse', cx: 84, cy: 384, rx: 10, ry: 7 },
]
const FRONT_HALF: Shape[] = [
  { muscle: 'shoulders', def: { kind: 'ellipse', cx: 63, cy: 80, rx: 13, ry: 12 } },
  { muscle: 'chest', def: { kind: 'path', d: 'M98 74 Q82 68 72 78 Q67 96 79 104 Q92 108 98 101 Z' } },
  { muscle: 'biceps', def: { kind: 'ellipse', cx: 54, cy: 110, rx: 7.5, ry: 17, rotate: 10 } },
  { muscle: 'forearms', def: { kind: 'ellipse', cx: 46, cy: 154, rx: 6.5, ry: 19, rotate: 12 } },
  { muscle: 'abs', def: { kind: 'path', d: 'M84 112 Q76 140 79 172 L86 176 L86 112 Z' } },
  { muscle: 'quads', def: { kind: 'path', d: 'M72 214 Q68 250 76 286 Q84 294 92 286 Q98 250 96 216 Q84 210 72 214 Z' } },
  { muscle: 'calves', def: { kind: 'ellipse', cx: 84, cy: 334, rx: 7, ry: 28 } },
]
const FRONT_CENTER: Shape[] = [
  { muscle: 'abs', def: { kind: 'rect', x: 89, y: 110, width: 22, height: 66, rx: 7 } },
]
const BACK_HALF: Shape[] = [
  { muscle: 'shoulders', def: { kind: 'ellipse', cx: 63, cy: 80, rx: 13, ry: 12 } },
  { muscle: 'lats', def: { kind: 'path', d: 'M74 92 Q66 124 82 160 L97 150 L97 104 Z' } },
  { muscle: 'triceps', def: { kind: 'ellipse', cx: 54, cy: 110, rx: 7.5, ry: 17, rotate: 10 } },
  { muscle: 'forearms', def: { kind: 'ellipse', cx: 46, cy: 154, rx: 6.5, ry: 19, rotate: 12 } },
  { muscle: 'glutes', def: { kind: 'ellipse', cx: 87, cy: 204, rx: 13, ry: 14 } },
  { muscle: 'hamstrings', def: { kind: 'path', d: 'M73 224 Q70 256 77 288 Q85 294 92 288 Q97 256 96 224 Q85 218 73 224 Z' } },
  { muscle: 'calves', def: { kind: 'ellipse', cx: 84, cy: 332, rx: 10, ry: 27 } },
]
const BACK_CENTER: Shape[] = [
  { muscle: 'traps', def: { kind: 'path', d: 'M100 56 L76 72 Q90 80 100 118 Q110 80 124 72 Z' } },
  { muscle: 'lowerBack', def: { kind: 'rect', x: 88, y: 152, width: 24, height: 32, rx: 6 } },
]

const MIRROR = 'translate(200, 0) scale(-1, 1)'

function renderDef(def: ShapeDef, key: string, props: object = {}) {
  if (def.kind === 'ellipse') {
    return (
      <Ellipse
        key={key}
        cx={def.cx} cy={def.cy} rx={def.rx} ry={def.ry}
        rotation={def.rotate ?? 0} originX={def.cx} originY={def.cy}
        {...props}
      />
    )
  }
  if (def.kind === 'rect') return <Rect key={key} x={def.x} y={def.y} width={def.width} height={def.height} rx={def.rx} {...props} />
  return <Path key={key} d={def.d} {...props} />
}

interface Props {
  view: BodyView
  muscles: Partial<Record<MuscleGroup, number>>
  selected?: MuscleGroup | null
  onSelect?: (m: MuscleGroup) => void
  pins?: BodyPin[]
  width: number
}

export function BodyModel({ view, muscles, selected, onSelect, pins = [], width }: Props) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const baseColor = dark ? '#1f2937' : '#e5e7eb'
  const muscleColor = dark ? '#374151' : '#d1d5db'
  const selectedColor = dark ? '#ffffff' : '#111827'
  const pinRing = dark ? '#030712' : '#ffffff'

  const half = view === 'front' ? FRONT_HALF : BACK_HALF
  const center = view === 'front' ? FRONT_CENTER : BACK_CENTER

  const renderShape = (shape: Shape, key: string) => {
    const level = muscleLoadLevel(muscles[shape.muscle] ?? 0)
    const isSelected = selected === shape.muscle
    return renderDef(shape.def, key, {
      fill: level ? LOAD_COLORS[level] : muscleColor,
      fillOpacity: level ? 0.85 : 1,
      stroke: isSelected ? selectedColor : undefined,
      strokeWidth: isSelected ? 2 : 0,
      onPress: onSelect ? () => onSelect(shape.muscle) : undefined,
    })
  }

  return (
    <Svg width={width} height={width * 2} viewBox="0 0 200 400">
      <G fill={baseColor}>
        {SILHOUETTE.map((d, i) => renderDef(d, `s${i}`))}
        {SILHOUETTE_HALF.map((d, i) => renderDef(d, `sh${i}`))}
        <G transform={MIRROR}>{SILHOUETTE_HALF.map((d, i) => renderDef(d, `shm${i}`))}</G>
      </G>
      {half.map((s, i) => renderShape(s, `l${i}`))}
      <G transform={MIRROR}>{half.map((s, i) => renderShape(s, `r${i}`))}</G>
      {center.map((s, i) => renderShape(s, `c${i}`))}
      {pins.map(pin => (
        <G key={pin.n}>
          <Circle cx={pin.x} cy={pin.y} r={8.5} fill={pin.color} stroke={pinRing} strokeWidth={2} />
          <SvgText x={pin.x} y={pin.y + 3.5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff">
            {String(pin.n)}
          </SvgText>
        </G>
      ))}
    </Svg>
  )
}
