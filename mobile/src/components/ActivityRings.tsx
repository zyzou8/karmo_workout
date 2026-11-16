import React from 'react'
import Svg, { Circle, G } from 'react-native-svg'

export interface Ring {
  value: number
  goal: number
  color: string
}

/** Apple Fitness–style concentric progress rings, matching the web version. */
export function ActivityRings({ rings, size = 120 }: { rings: Ring[]; size?: number }) {
  const stroke = size * 0.1
  const gap = stroke * 0.18
  const c = size / 2

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G rotation={-90} originX={c} originY={c}>
        {rings.map((ring, i) => {
          const r = c - stroke / 2 - i * (stroke + gap)
          const circumference = 2 * Math.PI * r
          const progress = ring.goal > 0 ? ring.value / ring.goal : 0
          const visible = Math.min(progress, 1) * circumference
          const overlap = progress > 1 ? Math.min(progress - 1, 1) * circumference : 0
          return (
            <G key={i}>
              <Circle cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeOpacity={0.18} strokeWidth={stroke} />
              {progress > 0 && (
                <Circle
                  cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${visible} ${circumference}`}
                />
              )}
              {overlap > 0 && (
                <Circle
                  cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${overlap} ${circumference}`}
                />
              )}
            </G>
          )
        })}
      </G>
    </Svg>
  )
}
