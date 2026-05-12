import { useMemo } from 'react'
import type { RankedEvent } from '@/lib/ranking'
import { baliDayKey, formatBaliDay, formatBaliTime } from '@/lib/ranking'

/**
 * 7-day plan view. No filters, no tray, no pinning — just the plan.
 * The export buttons live in the page, not here.
 *
 * Mobile: stacks into a single vertical column.
 * Desktop: 7-up grid.
 */
export function WeeklyPlan({
  days,
}: {
  days: { date: Date; events: RankedEvent[] }[]
}) {
  const todayKey = useMemo(() => baliDayKey(new Date()), [])
  const totalCount = useMemo(() => days.reduce((n, d) => n + d.events.length, 0), [days])

  if (totalCount === 0) {
    return (
      <div className="text-center text-sm text-muted py-8">
        no events this week — try picking more interests.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 w-full">
      {days.map(({ date, events }) => {
        const isToday = baliDayKey(date) === todayKey
        return (
          <div
            key={date.toISOString()}
            className={[
              'flex flex-col gap-2 rounded-2xl border p-3',
              isToday
                ? 'bg-lavender-light/50 border-lavender'
                : 'bg-paper/60 border-lavender-pale',
            ].join(' ')}
          >
            <div
              className={[
                'text-center text-xs font-pixel uppercase tracking-wide pb-1 border-b border-lavender-pale/60',
                isToday ? 'text-purple-deep' : 'text-muted',
              ].join(' ')}
            >
              {isToday ? 'today' : formatBaliDay(date)}
            </div>
            {events.length === 0 ? (
              <div className="text-center text-xs text-muted/50 py-4">no picks</div>
            ) : (
              events.map((e) => <EventCard key={e.uid} event={e} />)
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventCard({ event }: { event: RankedEvent }) {
  const startsAt = new Date(event.starts_at)
  const matchPct = Math.round(event.score * 100)
  const mismatch =
    event.surface_label &&
    event.actual_vibe &&
    event.surface_label.toLowerCase() !== event.actual_vibe.toLowerCase()

  return (
    <a
      href={`https://nomeo.io/m/${event.uid}`}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-paper rounded-xl border border-lavender-pale shadow-[0_1px_0_0_#efe8ff] hover:-translate-y-0.5 hover:shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary p-3 flex flex-col gap-1.5"
    >
      {event.poster_url ? (
        <div className="rounded-lg overflow-hidden border border-lavender-pale bg-lavender-light/20 -mx-1 -mt-1 mb-1">
          <img
            src={event.poster_url}
            alt=""
            aria-hidden="true"
            className="w-full h-24 sm:h-28 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted truncate">
          {formatBaliTime(startsAt)}
          {event.venue_name ? ` • ${event.venue_name}` : ''}
        </div>
        <span
          className="text-xs font-pixel text-purple-deep bg-purple-primary/15 border border-purple-primary/30 px-2 py-0.5 rounded-full whitespace-nowrap"
          aria-label={`vibe match ${matchPct} percent`}
        >
          {matchPct}%
        </span>
      </div>

      <div className="font-pixel text-base text-purple-dark leading-tight line-clamp-3">
        {event.name}
      </div>

      {event.actual_vibe && (
        <div className="text-xs text-purple-deep italic line-clamp-2">
          {event.actual_vibe}
        </div>
      )}

      {mismatch && (
        <div className="text-[11px] text-muted/70">
          on the tin: <span className="line-through">{event.surface_label}</span>
        </div>
      )}
    </a>
  )
}
