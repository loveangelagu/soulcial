import { useEffect, useMemo, useRef, useState } from 'react'
import { PERSONALITY_DIMS, type PersonalityDim, type PersonalityVec } from '@/lib/personality/vector'

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

/**
 * Read viewport width once + on resize so we can pick a comfortable SVG size.
 * Mobile (≤640px) → 240. Desktop → 320.
 */
function useResponsiveSize(): number {
  const [size, setSize] = useState(280)
  useEffect(() => {
    const compute = () => {
      if (typeof window === 'undefined') return 280
      return window.innerWidth <= 640 ? 240 : 320
    }
    setSize(compute())
    const onResize = () => setSize(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export function PersonalityRadar({
  vector,
  onChange,
  size: sizeProp,
}: {
  vector: PersonalityVec
  onChange?: (next: PersonalityVec) => void
  size?: number
}) {
  const autoSize = useResponsiveSize()
  const size = sizeProp ?? autoSize
  const labelFontSize = size <= 240 ? 10 : 11
  const labelPad = size <= 240 ? 14 : 16

  const center = size / 2
  const maxR = size / 2 - (labelPad + 16)  // room for labels + padding
  const n = PERSONALITY_DIMS.length
  const angle = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2

  const svgRef = useRef<SVGSVGElement | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const points = useMemo(() => {
    return PERSONALITY_DIMS.map((dim, i) => {
      const v = vector[dim] ?? 0
      const r = v * maxR
      const a = angle(i)
      return [center + r * Math.cos(a), center + r * Math.sin(a)] as const
    })
  }, [vector, center, maxR])

  const polyStr = points.map((p) => p.join(',')).join(' ')

  const updateFromPointer = (clientX: number, clientY: number, idx: number) => {
    if (!onChange) return
    const el = svgRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * size
    const y = ((clientY - rect.top) / rect.height) * size
    const dx = x - center
    const dy = y - center

    const a = angle(idx)
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const proj = dx * ux + dy * uy
    const v = Math.max(0, Math.min(1, proj / maxR))

    const dim = PERSONALITY_DIMS[idx] as PersonalityDim
    onChange({ ...vector, [dim]: v })
  }

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible flex-shrink-0"
      style={onChange ? { touchAction: 'none' } : undefined}
      onPointerMove={(e) => {
        if (dragIdx == null) return
        updateFromPointer(e.clientX, e.clientY, dragIdx)
      }}
      onPointerUp={() => setDragIdx(null)}
      onPointerCancel={() => setDragIdx(null)}
      onPointerLeave={() => setDragIdx(null)}
    >
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
      <polygon
        points={polyStr}
        fill="rgba(167, 139, 250, 0.35)"
        stroke="#7c3aed"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {points.map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={12}
            fill="transparent"
            style={onChange ? { cursor: 'grab' } : undefined}
            onPointerDown={(e) => {
              if (!onChange) return
              e.preventDefault()
              ;(e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId)
              setDragIdx(i)
              updateFromPointer(e.clientX, e.clientY, i)
            }}
          />
          <circle cx={x} cy={y} r={3.5} fill="#7c3aed" pointerEvents="none" />
        </g>
      ))}
      {PERSONALITY_DIMS.map((dim, i) => {
        const a = angle(i)
        const lx = center + (maxR + labelPad) * Math.cos(a)
        const ly = center + (maxR + labelPad) * Math.sin(a)
        return (
          <text
            key={dim}
            x={lx}
            y={ly}
            fontSize={labelFontSize}
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
