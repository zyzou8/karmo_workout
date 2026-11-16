export interface Ring {
  value: number
  goal: number
  color: string
}

/** Apple Fitness–style concentric progress rings; progress past the goal keeps wrapping. */
export function ActivityRings({ rings, size = 140 }: { rings: Ring[]; size?: number }) {
  const stroke = size * 0.1
  const gap = stroke * 0.18
  const c = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      {rings.map((ring, i) => {
        const r = c - stroke / 2 - i * (stroke + gap)
        const circumference = 2 * Math.PI * r
        const progress = ring.goal > 0 ? ring.value / ring.goal : 0
        const visible = Math.min(progress, 1) * circumference
        const overlap = progress > 1 ? Math.min(progress - 1, 1) * circumference : 0
        return (
          <g key={i}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeOpacity={0.18} strokeWidth={stroke} />
            {progress > 0 && (
              <circle
                cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${visible} ${circumference}`}
                className="transition-[stroke-dasharray] duration-700"
              />
            )}
            {overlap > 0 && (
              <circle
                cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${overlap} ${circumference}`}
                style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))' }}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
