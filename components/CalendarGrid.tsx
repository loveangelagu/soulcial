import { useMemo } from 'react'
import type { RankedEvent } from '@/lib/ranking'
import { baliTimeOfDay, formatBaliDay, formatBaliTime } from '@/lib/ranking'
import type { TimeOfDay } from '@/components/VibeSliders'

/**
 * 7-day plan view. Designed to keep cognitive load low:
 *   - one-line week summary at the top so the user can orient at a glance
 *   - simplified event cards: time, name, vibe, venue (no % footer, no
 *     "on the tin" rebuttal in the default view)
 *   - vibe-match shown as a small colored dot, not a number
 *   - empty days collapse to a quiet single line instead of a dashed box
 *   - today is subtly highlighted
 */
export function CalendarGrid({
  days,
  onRelaxFilters,
}: {
  days: { date: Date; events: RankedEvent[] }[]
  onRelaxFilters?: () => void
}) {
  const todayKey = useMemo(() => baliDayKey(new Date()), [])
  const allEvents = useMemo(() => days.flatMap((d) => d.events), [days])
  return (
    <div className="flex flex-col gap-4">
      <WeekSummary days={days} />

      {allEvents.length === 0 ? (
        <div className="text-center text-sm text-muted flex flex-col items-center gap-2 py-2">
          <p>no matches this week.</p>
          {onRelaxFilters && (
            <button
              type="button"
              onClick={onRelaxFilters}
              className="text-purple-deep underline underline-offset-4 hover:text-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded"
            >
              relax advanced filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-3 w-full">
          {days.map(({ date, events }) => {
            const isToday = baliDayKey(date) === todayKey
            return (
              <div
                key={date.toISOString()}
                className={[
                  'flex flex-col gap-2 rounded-2xl border p-2.5',
                  isToday
                    ? 'bg-lavender-light/50 border-lavender'
                    : 'bg-paper/60 border-lavender-pale',
                ].join(' ')}
              >
                <DayHeader date={date} isToday={isToday} />
                {events.length === 0 ? (
                  <EmptyDay />
                ) : (
                  events.map((e) => <EventCard key={e.uid} event={e} />)
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Week summary (glanceable orientation) ───────────────────────────────────

const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  morning: 'mornings',
  afternoon: 'afternoons',
  evening: 'evenings',
  night: 'nights',
}

function WeekSummary({
  days,
}: {
  days: { date: Date; events: RankedEvent[] }[]
}) {
  const all = useMemo(() => days.flatMap((d) => d.events), [days])
  const total = all.length

  const dominantTime = useMemo<TimeOfDay | null>(() => {
    if (all.length === 0) return null
    const c: Record<TimeOfDay, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    for (const e of all) c[baliTimeOfDay(new Date(e.starts_at))]++
    let best: TimeOfDay = 'morning'
    let bestN = -1
    ;(Object.keys(c) as TimeOfDay[]).forEach((k) => {
      if (c[k] > bestN) {
        best = k
        bestN = c[k]
      }
    })
    return bestN > 0 ? best : null
  }, [all])

  const topScore = useMemo(
    () => (all.length === 0 ? 0 : Math.max(...all.map((e) => e.score))),
    [all],
  )

  if (total === 0) {
    return (
      <p className="text-center text-sm text-muted">
        try loosening filters to reveal more matches.
      </p>
    )
  }

  return (
    <p className="text-center text-sm text-muted">
      <span className="font-pixel text-purple-deep text-base">{total}</span>{' '}
      event{total === 1 ? '' : 's'} this week
      {dominantTime && (
        <>
          {' '}· mostly{' '}
          <span className="font-pixel text-purple-deep text-base">
            {TIME_OF_DAY_LABEL[dominantTime]}
          </span>
        </>
      )}
      {' '}· top match{' '}
      <span className="font-pixel text-purple-deep text-base">
        {Math.round(topScore * 100)}%
      </span>
    </p>
  )
}

// ─── Day header + empty state ────────────────────────────────────────────────

function DayHeader({ date, isToday }: { date: Date; isToday: boolean }) {
  return (
    <div
      className={[
        'text-center text-xs font-pixel uppercase tracking-wide',
        isToday ? 'text-purple-deep' : 'text-muted',
      ].join(' ')}
    >
      {isToday ? 'today' : formatBaliDay(date)}
    </div>
  )
}

function EmptyDay() {
  return (
    <div className="text-center text-[11px] text-muted/50 py-3">no picks</div>
  )
}

// ─── Event card ──────────────────────────────────────────────────────────────

function EventCard({ event }: { event: RankedEvent }) {
  const startsAt = new Date(event.starts_at)
  const matchPct = Math.round(event.score * 100)

  const mismatch =
    event.surface_label &&
    event.actual_vibe &&
    event.surface_label.toLowerCase() !== event.actual_vibe.toLowerCase()

  return (
    <article className="bg-paper rounded-2xl border border-lavender-pale shadow-[0_1px_0_0_#efe8ff] p-3 flex flex-col gap-1.5">
      {event.poster_url ? (
        <a
          href={`https://nomeo.io/m/${event.uid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-lavender-pale bg-lavender-light/20 mb-1"
          aria-label={`Open ${event.name} on Nomeo`}
        >
          <img
            src={event.poster_url}
            alt={event.name}
            className="w-full h-28 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </a>
      ) : null}
      <a
        href={`https://nomeo.io/m/${event.uid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded-lg"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[11px] text-muted truncate">
            {formatBaliTime(startsAt)}
            {event.venue_name ? ` • ${event.venue_name}` : ''}
          </div>
          <MatchTier score={event.score} />
        </div>

        <div className="font-pixel text-[15px] text-purple-dark leading-tight line-clamp-2">
          {event.name}
        </div>

        {event.actual_vibe && mismatch && (
          <div className="text-[10px] text-muted italic line-clamp-1 mt-1">
            {event.actual_vibe}
          </div>
        )}
      </a>

      <details className="rounded-xl border border-lavender-pale bg-lavender-light/30 px-2 py-1">
        <summary className="cursor-pointer text-[11px] text-purple-deep font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded">
          why this match for {event.name}
        </summary>
        <div className="mt-1 text-[11px] text-muted leading-relaxed">
          <div>vibe match: {matchPct}%</div>
          {mismatch && (
            <div>
              on the tin: {event.surface_label} · actually: {event.actual_vibe}
            </div>
          )}
        </div>
      </details>
    </article>
  )
}

function MatchDot({ score }: { score: number }) {
  const tier = score >= 0.75 ? 'strong' : score >= 0.6 ? 'good' : 'okay'
  const cls =
    tier === 'strong'
      ? 'bg-purple-deep'
      : tier === 'good'
        ? 'bg-purple-primary'
        : 'bg-lavender'
  return (
    <span
      aria-label={`${Math.round(score * 100)}% match`}
      title={`${Math.round(score * 100)}% match`}
      className={`inline-block h-2 w-2 rounded-full ${cls}`}
    />
  )
}

function MatchTier({ score }: { score: number }) {
  const tier = score >= 0.75 ? 'strong' : score >= 0.6 ? 'good' : 'okay'
  return (
    <span className="inline-flex items-center gap-1 shrink-0 text-[10px] text-muted uppercase tracking-wide">
      <MatchDot score={score} />
      {tier}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BALI_OFFSET_MS = 8 * 60 * 60 * 1000

function baliDayKey(d: Date): string {
  return new Date(d.getTime() + BALI_OFFSET_MS).toISOString().slice(0, 10)
}
