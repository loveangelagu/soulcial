import { useEffect, useRef, useState } from 'react'
import { INTERESTS } from '@/lib/interests'

const MAX_INTERESTS = 3

/**
 * Pill style mirrors metverse's TogglePills:
 *   unselected → white bg, light-grey border (quiet)
 *   selected   → vibrant pastel bg, matching border + dark colored text,
 *                with the metverse "pressed pill" 0 2px 0 shadow
 *   disabled   → 0.35 opacity (when cap is reached)
 *
 * Each interest gets a stable color by its index in the curated list, so the
 * palette cycles cleanly across the picker the same way it does in metverse.
 */
const TRAIT_COLORS: { bg: string; border: string; text: string }[] = [
  { bg: '#fff3d0', border: '#f0d060', text: '#7a6020' }, // Sunny yellow
  { bg: '#d4f5d4', border: '#70cc70', text: '#2a6a2a' }, // Fresh green
  { bg: '#ffd8e8', border: '#f090b0', text: '#8a2050' }, // Soft pink
  { bg: '#e0d4ff', border: '#a890e8', text: '#4a2a8a' }, // Lavender
  { bg: '#d0ecff', border: '#70b8e8', text: '#1a5080' }, // Sky blue
  { bg: '#ffe0cc', border: '#f0a870', text: '#8a4a10' }, // Peach
  { bg: '#ccf5ee', border: '#60ccb8', text: '#1a6a5a' }, // Mint
  { bg: '#ffd0d0', border: '#e88080', text: '#7a2020' }, // Coral
]

export function InterestPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const atCap = selected.length >= MAX_INTERESTS

  // Brief "pop" animation on the just-toggled pill — gives a snappy tactile
  // feel without a global rerender.
  const [pop, setPop] = useState<string | null>(null)
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (popTimer.current) clearTimeout(popTimer.current) }, [])

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      if (atCap) return
      onChange([...selected, id])
    }
    setPop(id)
    if (popTimer.current) clearTimeout(popTimer.current)
    popTimer.current = setTimeout(() => setPop(null), 280)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted">
        {selected.length === 0
          ? `pick up to ${MAX_INTERESTS}`
          : selected.length < MAX_INTERESTS
            ? `${selected.length} of ${MAX_INTERESTS} picked`
            : `${MAX_INTERESTS} of ${MAX_INTERESTS} picked — tap to swap`}
      </div>

      <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
        {INTERESTS.map((i, idx) => {
          const on = selected.includes(i.id)
          const disabled = !on && atCap
          const c = TRAIT_COLORS[idx % TRAIT_COLORS.length]
          const popping = pop === i.id

          const style: React.CSSProperties = on
            ? {
                background: c.bg,
                borderColor: c.border,
                color: c.text,
                boxShadow: `0 2px 0 ${c.border}`,
              }
            : {
                background: '#ffffff',
                borderColor: '#e2e6ee',
                color: '#6a6a80',
              }

          return (
            <button
              key={i.id}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => toggle(i.id)}
              style={{
                ...style,
                opacity: disabled ? 0.35 : 1,
                animation: popping ? 'pillPop 0.28s cubic-bezier(.36,.07,.19,.97)' : undefined,
                transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease, opacity 140ms ease, box-shadow 140ms ease, transform 140ms ease',
              }}
              className={[
                'h-9 px-3.5 rounded-full border-2 font-sans text-sm inline-flex items-center gap-1.5 select-none cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
                disabled ? 'cursor-not-allowed' : 'hover:-translate-y-0.5',
              ].join(' ')}
            >
              <span aria-hidden="true" className="text-base leading-none">{i.emoji}</span>
              <span className="font-medium">{i.label}</span>
            </button>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes pillPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
