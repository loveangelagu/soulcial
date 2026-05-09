import { PERSONALITY_DIMS, type PersonalityVec } from '@/lib/personality/vector'

const DIM_LABELS: Record<string, string> = {
  openness:           'open',
  embodiment:         'embodied',
  edge_seeking:       'edgy',
  stillness:          'still',
  expression:         'expressive',
  systems:            'systems',
  communion:          'communal',
  service:            'service',
  agency:             'agentic',
  mystic:             'mystic',
  tempo:              'fast',
  status_orientation: 'status',
}

export function PersonalityRadar({
  vector,
  size = 280,
}: {
  vector: PersonalityVec
  size?: number
}) {
  const center = size / 2
  const maxR = size / 2 - 32  // padding for labels
  const n = PERSONALITY_DIMS.length
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2

  // Build polygon points for the user's vector.
  const points = PERSONALITY_DIMS.map((dim, i) => {
    const v = vector[dim] ?? 0
    const r = v * maxR
    const a = angle(i)
    return [center + r * Math.cos(a), center + r * Math.sin(a)]
  })

  const polyStr = points.map((p) => p.join(',')).join(' ')

  // Build axis lines + labels.
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {/* Concentric guide circles */}
      {[0.25, 0.5, 0.75, 1.0].map((t) => (
        <circle
          key={t}
          cx={center}
          cy={center}
          r={maxR * t}
          fill="none"
          stroke="#e9e0ff"
          strokeWidth={1}
        />
      ))}
      {/* Axis spokes */}
      {PERSONALITY_DIMS.map((_, i) => {
        const a = angle(i)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + maxR * Math.cos(a)}
            y2={center + maxR * Math.sin(a)}
            stroke="#e9e0ff"
            strokeWidth={1}
          />
        )
      })}
      {/* User polygon */}
      <polygon
        points={polyStr}
        fill="rgba(167, 139, 250, 0.35)"
        stroke="#7c3aed"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* User vertices */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#7c3aed" />
      ))}
      {/* Labels */}
      {PERSONALITY_DIMS.map((dim, i) => {
        const a = angle(i)
        const lx = center + (maxR + 16) * Math.cos(a)
        const ly = center + (maxR + 16) * Math.sin(a)
        return (
          <text
            key={dim}
            x={lx}
            y={ly}
            fontSize={11}
            fill="#6a6a80"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-sans"
          >
            {DIM_LABELS[dim] ?? dim}
          </text>
        )
      })}
    </svg>
  )
}
