import { PACE_VALUES, type Pace } from '@/lib/sliders-types'

const PACE_META: Record<Pace, { emoji: string; label: string; sub: string }> = {
  slow:  { emoji: '🧘', label: 'slow',  sub: '~1/day, savor it' },
  mixed: { emoji: '⚖️',  label: 'mixed', sub: '~2/day, balanced' },
  busy:  { emoji: '🔥', label: 'busy',  sub: '~3/day, packed week' },
}

/**
 * The only knob. Three stops. No presets, no other sliders, no filters.
 */
export function PaceDial({
  value,
  onChange,
}: {
  value: Pace
  onChange: (next: Pace) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="How packed should your week be?"
      className="grid grid-cols-3 gap-3 w-full max-w-2xl mx-auto"
    >
      {PACE_VALUES.map((p) => {
        const meta = PACE_META[p]
        const on = value === p
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(p)}
            className={[
              'flex flex-col items-center justify-center gap-1 min-h-[88px] px-3 py-4 rounded-2xl border-2 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
              on
                ? 'bg-purple-primary text-white border-purple-deep shadow-press'
                : 'bg-paper text-ink border-lavender-pale hover:border-purple-primary hover:bg-lavender-light',
            ].join(' ')}
          >
            <span aria-hidden="true" className="text-3xl leading-none">
              {meta.emoji}
            </span>
            <span className="font-pixel text-pixel-lg leading-none">{meta.label}</span>
            <span
              className={[
                'text-xs sm:text-sm mt-0.5 text-center',
                on ? 'text-white/85' : 'text-muted',
              ].join(' ')}
            >
              {meta.sub}
            </span>
          </button>
        )
      })}
    </div>
  )
}
