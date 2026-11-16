import React from 'react'
import Svg, { Circle, Line, Path, Rect, Text as SvgText, G } from 'react-native-svg'

export function PhotoAngleDiagram() {
  return (
    <Svg viewBox="0 0 220 120" width="100%" height={90}>
      <Line x1="10" y1="100" x2="210" y2="100" stroke="#374151" strokeWidth="2" />

      <G stroke="#93c5fd" strokeWidth="3" fill="none" strokeLinecap="round">
        <Circle cx="70" cy="55" r="7" fill="#93c5fd" stroke="none" />
        <Path d="M70 62 L66 80" />
        <Path d="M66 80 L52 92" />
        <Path d="M66 80 L78 92" />
        <Path d="M68 68 L52 78" />
        <Path d="M68 68 L86 62" />
      </G>

      <Line x1="70" y1="100" x2="150" y2="100" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
      <Line x1="70" y1="100" x2="70" y2="40" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
      <Path d="M78 100 L78 92 L70 92" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <SvgText x="82" y="90" fontSize="9" fill="#f59e0b">90°</SvgText>

      <G>
        <Rect x="150" y="88" width="26" height="18" rx="3" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
        <Circle cx="163" cy="97" r="6" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <Rect x="168" y="84" width="6" height="4" rx="1" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
      </G>
      <Line x1="150" y1="97" x2="86" y2="85" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" />
    </Svg>
  )
}
