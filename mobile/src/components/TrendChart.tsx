import React from 'react'
import Svg, { Defs, LinearGradient, Polyline, Stop } from 'react-native-svg'

interface TrendChartProps {
  values: number[]
  colorFrom?: string
  colorTo?: string
  gradientId: string
  height?: number
}

export function TrendChart({ values, colorFrom = '#a78bfa', colorTo = '#c084fc', gradientId, height = 80 }: TrendChartProps) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 300
  const h = height
  const pad = 8

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2)
      const y = pad + (1 - (v - min) / range) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={colorFrom} />
          <Stop offset="100%" stopColor={colorTo} />
        </LinearGradient>
      </Defs>
      <Polyline
        points={points}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
