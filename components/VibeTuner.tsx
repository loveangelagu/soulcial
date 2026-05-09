import { useMemo, useId } from 'react'
import {
  ALL_DAYS,
  ALL_TIMES_OF_DAY,
  DEFAULT_SLIDERS,
  type DayOfWeek,
  type EnergyFloor,
  type GroupSize,
  type TimeOfDay,
  type VibeSliders,
} from './VibeSliders'
import type { RankedEvent } from '@/lib/ranking'
import { baliTimeOfDay, formatBaliDay, formatBaliTime } from '@/lib/ranking'
import { trackAdvancedFilterOpened, trackZeroResultRecovery } from '@/lib/uxMetrics'

/**
 * "Tune your week" — the redesigned step-3 surface.
 *
 * Built on NN/g slider/control guidance: presets-first, snapped sliders with
 * live plain-language labels, optional disclosure for advanced filters, and
 * a live impact preview so the user gets instant feedback on every tweak.
 */
export function VibeTuner({
  values,
  onChange,
  previewDays,
}: {
  values: VibeSliders
  onChange: (next: VibeSliders) => void
  previewDays: { date: Date; events: RankedEvent[] }[]
}) {
  const set = <K extends keyof VibeSliders>(key: K, v: VibeSliders[K]) =>
    onChange({ ...values, [key]: v })

  const activePreset = useMemo(() => detectPreset(values), [values])
  const isDefault = activePreset === 'balanced' && isAllDefault(values)

  return (
    <div className="flex flex-col gap-6">
      <PresetChips
        active={activePreset}
        onPick={(p) => onChange({ ...values, ...PRESETS[p] })}
      />

      <div className="flex flex-col gap-5">
        <TunerSlider
          label="Pace"
          help="How packed should your week feel?"
          value={values.tempo}
          stops={PACE_LABELS}
          onChange={(v) => set('tempo', v)}
        />
        <TunerSlider
          label="Social"
          help="How much people-time do you want?"
          value={values.social}
          stops={SOCIAL_LABELS}
          onChange={(v) => set('social', v)}
        />
        <TunerSlider
          label="Comfort vs Stretch"
          help="Stick to what you know, or try new things?"
          value={values.stretch}
          stops={STRETCH_LABELS}
          onChange={(v) => set('stretch', v)}
        />
      </div>

      <MoreOptions
        values={values}
        onSet={(patch) => onChange({ ...values, ...patch })}
      />

      <VibePreview
        days={previewDays}
        onRelaxTimeAndDays={() => {
          trackZeroResultRecovery()
          onChange({
            ...values,
            timeOfDay: [...ALL_TIMES_OF_DAY],
            daysAvailable: [...ALL_DAYS],
          })
        }}
        onResetAdvancedFilters={() => {
          trackZeroResultRecovery()
          onChange({
            ...values,
            timeOfDay: [...ALL_TIMES_OF_DAY],
            daysAvailable: [...ALL_DAYS],
            energyFloor: 'any',
            groupSize: 'any',
          })
        }}
      />

      {!isDefault && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_SLIDERS })}
          className="self-center text-xs text-muted hover:text-purple-deep underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded"
        >
          reset to balanced
        </button>
      )}
    </div>
  )
}

// ─── Presets ─────────────────────────────────────────────────────────────────

type PresetId = 'chill' | 'balanced' | 'fomo' | 'adventure'

const PRESETS: Record<PresetId, Partial<VibeSliders>> = {
  chill: {
    tempo: 0.25,
    social: 0.25,
    stretch: 0.25,
    energyFloor: 'any',
    groupSize: 'any',
  },
  balanced: {
    tempo: 0.5,
    social: 0.5,
    stretch: 0.5,
    energyFloor: 'any',
    groupSize: 'any',
  },
  fomo: {
    tempo: 0.75,
    social: 0.75,
    stretch: 0.5,
    energyFloor: 'medium+',
    groupSize: 'any',
  },
  adventure: {
    tempo: 0.75,
    social: 0.5,
    stretch: 1,
    energyFloor: 'medium+',
    groupSize: 'any',
  },
}

const PRESET_META: { id: PresetId; emoji: string; label: string; sub: string }[] = [
  { id: 'chill',     emoji: '🧘', label: 'Chill week',  sub: '~1/day, low key' },
  { id: 'balanced',  emoji: '⚖️',  label: 'Balanced',   sub: 'a bit of everything' },
  { id: 'fomo',      emoji: '🔥', label: 'FOMO mode',   sub: 'pack it in' },
  { id: 'adventure', emoji: '🚀', label: 'Adventure',   sub: 'push my limits' },
]

function detectPreset(v: VibeSliders): PresetId | null {
  for (const meta of PRESET_META) {
    const p = PRESETS[meta.id]
    const matches = (Object.keys(p) as (keyof VibeSliders)[]).every((k) =>
      almostEqual(v[k] as any, p[k] as any),
    )
    if (matches) return meta.id
  }
  return null
}

function almostEqual(a: any, b: any): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 0.01
  return a === b
}

function isAllDefault(v: VibeSliders): boolean {
  return (
    v.tempo === DEFAULT_SLIDERS.tempo &&
    v.social === DEFAULT_SLIDERS.social &&
    v.stretch === DEFAULT_SLIDERS.stretch &&
    v.energyFloor === DEFAULT_SLIDERS.energyFloor &&
    v.groupSize === DEFAULT_SLIDERS.groupSize &&
    sameSet(v.timeOfDay, DEFAULT_SLIDERS.timeOfDay) &&
    sameSet(v.daysAvailable, DEFAULT_SLIDERS.daysAvailable)
  )
}

function sameSet<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a as any[])
  return (b as any[]).every((x) => s.has(x))
}

function PresetChips({
  active,
  onPick,
}: {
  active: PresetId | null
  onPick: (p: PresetId) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-pixel text-sm text-purple-dark uppercase tracking-wider">
          quick start
        </span>
        {active === null && (
          <span className="text-[10px] font-pixel uppercase tracking-wider text-purple-deep bg-lavender-light px-2 py-0.5 rounded-full">
            custom
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PRESET_META.map((p) => {
          const on = active === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={on}
              className={[
                'min-h-[44px] px-3 py-2 rounded-2xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
                on
                  ? 'bg-purple-primary text-white border-purple-deep shadow-[0_3px_0_0_#4a2a8a]'
                  : 'bg-paper text-ink border-lavender-pale shadow-[0_2px_0_0_#e9e0ff] hover:border-purple-primary hover:bg-lavender-light',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true">{p.emoji}</span>
                <span className="font-pixel text-base leading-none">{p.label}</span>
              </div>
              <div
                className={[
                  'text-[10px] mt-0.5',
                  on ? 'text-white/80' : 'text-muted',
                ].join(' ')}
              >
                {p.sub}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stepped slider ──────────────────────────────────────────────────────────

const STOPS = [0, 0.25, 0.5, 0.75, 1] as const

const PACE_LABELS    = ['very chill',   'chill',        'mixed',  'busy',           'packed']
const SOCIAL_LABELS  = ['hermit',       'mostly solo',  'mixed',  'mostly social',  'full party mode']
const STRETCH_LABELS = ['comfort zone', 'familiar',     'open',   'curious',        'push my limits']

function snapToStop(v: number): number {
  let best: number = STOPS[0]
  let bestD = Math.abs(v - best)
  for (const s of STOPS) {
    const d = Math.abs(v - s)
    if (d < bestD) {
      best = s
      bestD = d
    }
  }
  return best
}

function stopIndex(v: number): number {
  const snapped = snapToStop(v)
  for (let i = 0; i < STOPS.length; i++) {
    if (STOPS[i] === snapped) return i
  }
  return 2
}

function TunerSlider({
  label,
  help,
  value,
  stops,
  onChange,
}: {
  label: string
  help: string
  value: number
  stops: string[]
  onChange: (v: number) => void
}) {
  const id = useId()
  const labelId = `${id}-label`
  const valueId = `${id}-value`
  const idx = stopIndex(value)
  const current = stops[idx]

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label
          id={labelId}
          htmlFor={id}
          className="font-pixel text-base text-purple-dark"
        >
          {label}
        </label>
        <span
          id={valueId}
          className="font-pixel text-sm text-purple-deep bg-lavender-light px-2 py-0.5 rounded-full"
        >
          {current}
        </span>
      </div>
      <p className="text-[11px] text-muted mb-2">{help}</p>

      {/* 44px hit area wraps the visually thinner track */}
      <div className="relative py-3">
        <input
          id={id}
          type="range"
          min={0}
          max={4}
          step={1}
          value={idx}
          onChange={(e) => onChange(STOPS[Number(e.target.value)])}
          aria-labelledby={labelId}
          aria-describedby={valueId}
          aria-valuetext={current}
          className="vibe-slider w-full h-2 rounded-full appearance-none bg-lavender-pale accent-purple-deep cursor-pointer"
        />
        <div className="flex justify-between mt-1 px-[14px]" aria-hidden="true">
          {stops.map((_, i) => (
            <span
              key={i}
              className={[
                'h-1.5 w-1.5 rounded-full transition-colors',
                i === idx ? 'bg-purple-deep' : 'bg-lavender-pale',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .vibe-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #7c3aed;
          border: 3px solid #fffdf8;
          box-shadow: 0 2px 0 0 #4a2a8a;
          cursor: pointer;
        }
        .vibe-slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #7c3aed;
          border: 3px solid #fffdf8;
          box-shadow: 0 2px 0 0 #4a2a8a;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

// ─── More options (disclosure) ───────────────────────────────────────────────

const TIME_META: { id: TimeOfDay; emoji: string; label: string; range: string }[] = [
  { id: 'morning',   emoji: '🌅', label: 'Morning',   range: 'before noon' },
  { id: 'afternoon', emoji: '☀️',  label: 'Afternoon', range: '12 – 5pm' },
  { id: 'evening',   emoji: '🌆', label: 'Evening',   range: '5 – 9pm' },
  { id: 'night',     emoji: '🌙', label: 'Night',     range: '9pm onward' },
]

const DAY_META: { id: DayOfWeek; short: string }[] = [
  { id: 0, short: 'Su' },
  { id: 1, short: 'Mo' },
  { id: 2, short: 'Tu' },
  { id: 3, short: 'We' },
  { id: 4, short: 'Th' },
  { id: 5, short: 'Fr' },
  { id: 6, short: 'Sa' },
]
const DAY_NAME: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const ENERGY_META: { id: EnergyFloor; label: string }[] = [
  { id: 'any',      label: 'any energy' },
  { id: 'medium+',  label: 'medium+' },
  { id: 'high',     label: 'high only' },
]

const GROUP_META: { id: GroupSize; label: string }[] = [
  { id: 'any',     label: 'any' },
  { id: 'solo-ok', label: 'solo-friendly' },
  { id: 'small',   label: 'small group' },
  { id: 'crowd',   label: 'crowd' },
]

function MoreOptions({
  values,
  onSet,
}: {
  values: VibeSliders
  onSet: (patch: Partial<VibeSliders>) => void
}) {
  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]

  return (
    <details
      className="group rounded-2xl border-2 border-lavender-pale bg-lavender-light/40 overflow-hidden"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) trackAdvancedFilterOpened()
      }}
    >
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 font-pixel text-sm text-purple-dark uppercase tracking-wider select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary">
        <span>more filters</span>
        <span className="text-[10px] normal-case tracking-normal text-muted text-right">
          {activeFilterSummary(values)}
        </span>
        <span
          className="text-purple-deep transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          ▾
        </span>
      </summary>

      <div className="px-4 pb-4 pt-1 flex flex-col gap-4">
        {/* Time of day */}
        <FieldGroup label="Time of day">
          <div className="flex flex-wrap gap-2">
            {TIME_META.map((t) => {
              const on = values.timeOfDay.includes(t.id)
              return (
                <Chip
                  key={t.id}
                  on={on}
                  onClick={() => {
                    const next = toggle(values.timeOfDay, t.id)
                    // never let the user filter to nothing — fall back to all.
                    onSet({ timeOfDay: next.length === 0 ? [...ALL_TIMES_OF_DAY] : next.sort() })
                  }}
                >
                  <span aria-hidden="true">{t.emoji}</span>
                  <span>{t.label}</span>
                  <span className="text-[10px] opacity-70 ml-0.5">({t.range})</span>
                </Chip>
              )
            })}
          </div>
        </FieldGroup>

        {/* Days available */}
        <FieldGroup label="Days available">
          <div className="flex gap-1.5">
            {DAY_META.map((d) => {
              const on = values.daysAvailable.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    const next = toggle(values.daysAvailable, d.id)
                    onSet({
                      daysAvailable: next.length === 0
                        ? [...ALL_DAYS]
                        : (next.sort((a, b) => a - b) as DayOfWeek[]),
                    })
                  }}
                  aria-pressed={on}
                  aria-label={DAY_NAME[d.id]}
                  className={[
                    'flex-1 min-h-[44px] rounded-xl border-2 font-pixel text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
                    on
                      ? 'bg-purple-primary text-white border-purple-deep shadow-[0_2px_0_0_#4a2a8a]'
                      : 'bg-paper text-ink border-lavender-pale hover:border-purple-primary',
                  ].join(' ')}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
        </FieldGroup>

        {/* Energy floor */}
        <FieldGroup label="Energy floor">
          <Segmented
            options={ENERGY_META}
            value={values.energyFloor}
            onChange={(v) => onSet({ energyFloor: v })}
          />
        </FieldGroup>

        {/* Group size */}
        <FieldGroup label="Group size">
          <Segmented
            options={GROUP_META}
            value={values.groupSize}
            onChange={(v) => onSet({ groupSize: v })}
          />
        </FieldGroup>

        {/* Coming soon: budget + area. Placeholder to reserve the design space.
            TODO: enable when tagger emits `price_band` + `neighborhood`. */}
        <FieldGroup label="Coming soon">
          <div className="flex flex-wrap gap-2">
            <Chip on={false} disabled title="needs price_band field from tagger">
              💸 budget
            </Chip>
            <Chip on={false} disabled title="needs neighborhood field from tagger">
              📍 area
            </Chip>
          </div>
        </FieldGroup>
      </div>
    </details>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-pixel uppercase tracking-wider text-muted mb-1.5">
        {label}
      </div>
      {children}
    </div>
  )
}

function Chip({
  on,
  onClick,
  disabled,
  title,
  children,
}: {
  on: boolean
  onClick?: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      title={title}
      className={[
        'min-h-[44px] px-3 py-2 rounded-full border-2 text-xs font-sans inline-flex items-center gap-1 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
        disabled
          ? 'bg-paper text-muted/60 border-lavender-pale cursor-not-allowed opacity-60'
          : on
            ? 'bg-purple-primary text-white border-purple-deep shadow-[0_2px_0_0_#4a2a8a]'
            : 'bg-paper text-ink border-lavender-pale hover:border-purple-primary hover:bg-lavender-light',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex w-full bg-paper rounded-xl border-2 border-lavender-pale p-1 gap-1"
    >
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={[
              'flex-1 min-h-[44px] px-2 rounded-lg text-xs font-sans transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
              on
                ? 'bg-purple-primary text-white shadow-[0_2px_0_0_#4a2a8a]'
                : 'text-ink hover:bg-lavender-light',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Live preview ────────────────────────────────────────────────────────────

function VibePreview({
  days,
  onRelaxTimeAndDays,
  onResetAdvancedFilters,
}: {
  days: { date: Date; events: RankedEvent[] }[]
  onRelaxTimeAndDays?: () => void
  onResetAdvancedFilters?: () => void
}) {
  const all = days.flatMap((d) => d.events)
  const total = all.length
  const activeDays = days.filter((d) => d.events.length > 0).length
  const top = [...all].sort((a, b) => b.score - a.score).slice(0, 2)

  return (
    <div className="rounded-2xl border-2 border-lavender-pale bg-lavender-light/50 p-4">
      <div className="font-pixel text-sm text-purple-dark uppercase tracking-wider mb-2">
        live preview
      </div>

      {total === 0 ? (
        <div className="text-sm text-muted flex flex-col gap-2">
          <div>no events match these filters yet.</div>
          <div className="flex flex-wrap gap-2">
            {onRelaxTimeAndDays && (
              <button
                type="button"
                onClick={onRelaxTimeAndDays}
                className="px-2.5 py-1 rounded-full border border-lavender text-purple-deep hover:bg-lavender-light text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
              >
                open time and days
              </button>
            )}
            {onResetAdvancedFilters && (
              <button
                type="button"
                onClick={onResetAdvancedFilters}
                className="px-2.5 py-1 rounded-full border border-lavender text-purple-deep hover:bg-lavender-light text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
              >
                reset advanced filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm text-ink mb-3 leading-relaxed">
            <span className="font-pixel text-purple-deep text-base">{total}</span>{' '}
            event{total === 1 ? '' : 's'} across{' '}
            <span className="font-pixel text-purple-deep text-base">
              {activeDays}
            </span>{' '}
            day{activeDays === 1 ? '' : 's'}
          </div>

          <div className="flex flex-col gap-1.5">
            {top.map((e) => (
              <PreviewRow key={e.uid} event={e} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function activeFilterSummary(values: VibeSliders): string {
  const items: string[] = []
  if (values.timeOfDay.length < ALL_TIMES_OF_DAY.length) items.push(`${values.timeOfDay.length} times`)
  if (values.daysAvailable.length < ALL_DAYS.length) items.push(`${values.daysAvailable.length} days`)
  if (values.energyFloor !== 'any') items.push(`energy ${values.energyFloor}`)
  if (values.groupSize !== 'any') items.push(`group ${values.groupSize}`)
  return items.length === 0 ? 'all defaults' : items.join(' · ')
}

function PreviewRow({ event }: { event: RankedEvent }) {
  const startsAt = new Date(event.starts_at)
  return (
    <div className="flex items-center gap-2 bg-paper rounded-xl border border-lavender-pale px-2.5 py-1.5">
      <div className="text-[10px] font-pixel text-muted uppercase tracking-wide w-14 shrink-0">
        {formatBaliDay(startsAt).split(',')[0]}
        <br />
        {formatBaliTime(startsAt)}
      </div>
      <div className="font-pixel text-sm text-purple-dark truncate flex-1">
        {event.name}
      </div>
      <div className="font-pixel text-xs text-purple-deep shrink-0">
        {Math.round(event.score * 100)}%
      </div>
    </div>
  )
}
