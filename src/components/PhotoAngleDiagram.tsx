export function PhotoAngleDiagram() {
  return (
    <svg viewBox="0 0 220 120" className="w-full h-24 mt-3" role="img" aria-label="Diagram showing a 90 degree side-view camera angle relative to the athlete">
      <line x1="10" y1="100" x2="210" y2="100" stroke="#374151" strokeWidth="2" />

      {/* simplified squat-bottom stick figure */}
      <g stroke="#93c5fd" strokeWidth="3" fill="none" strokeLinecap="round">
        <circle cx="70" cy="55" r="7" fill="#93c5fd" stroke="none" />
        <path d="M70 62 L66 80" />
        <path d="M66 80 L52 92" />
        <path d="M66 80 L78 92" />
        <path d="M68 68 L52 78" />
        <path d="M68 68 L86 62" />
      </g>

      {/* facing direction / camera line, meeting at 90 degrees */}
      <line x1="70" y1="100" x2="150" y2="100" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="70" y1="100" x2="70" y2="40" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M78 100 L78 92 L70 92" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="82" y="90" fontSize="9" fill="#f59e0b">90°</text>

      {/* camera icon at the side */}
      <g transform="translate(150,88)">
        <rect x="0" y="0" width="26" height="18" rx="3" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
        <circle cx="13" cy="9" r="6" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <rect x="18" y="-4" width="6" height="4" rx="1" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
      </g>
      <line x1="150" y1="97" x2="86" y2="85" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  )
}
