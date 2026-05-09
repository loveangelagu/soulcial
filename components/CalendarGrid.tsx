import type { RankedEvent } from '@/lib/ranking'
import { formatBaliDay, formatBaliTime } from '@/lib/ranking'

export function CalendarGrid({
  days,
}: {
  days: { date: Date; events: RankedEvent[] }[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 w-full">
      {days.map(({ date, events }) => (
        <div key={date.toISOString()} className="flex flex-col gap-2">
          <div className="text-center text-xs text-muted font-pixel uppercase tracking-wide">
            {formatBaliDay(date)}
          </div>
          {events.length === 0 ? (
            <div className="flex-1 min-h-[120px] rounded-2xl border-2 border-dashed border-lavender-pale flex items-center justify-center text-xs text-muted">
              nothing today
            </div>
          ) : (
            events.map((e) => <EventCard key={e.uid} event={e} />)
          )}
        </div>
      ))}
    </div>
  )
}

function EventCard({ event }: { event: RankedEvent }) {
  const startsAt = new Date(event.starts_at)
  return (
    <a
      href={`https://nomeo.io/m/${event.uid}`}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-paper rounded-2xl border-[3px] border-lavender-pale shadow-[0_3px_0_0_#e9e0ff] hover:shadow-[0_4px_0_0_#c4b5fd] hover:border-lavender p-3 transition-all flex flex-col gap-1.5"
    >
      <div className="text-xs text-muted">{formatBaliTime(startsAt)}</div>
      <div className="font-pixel text-base text-purple-dark leading-tight line-clamp-2">
        {event.name}
      </div>
      {event.actual_vibe && (
        <div className="text-xs text-purple-deep italic line-clamp-2">
          {event.actual_vibe}
        </div>
      )}
      {event.surface_label && event.actual_vibe && event.surface_label.toLowerCase() !== event.actual_vibe.toLowerCase() && (
        <div className="text-[10px] text-muted/70">
          on the tin: <span className="line-through">{event.surface_label}</span>
        </div>
      )}
      {event.venue_name && (
        <div className="text-[11px] text-muted truncate">📍 {event.venue_name}</div>
      )}
      <div className="mt-auto pt-1 flex items-center justify-between text-[10px] text-muted">
        <span>vibe match</span>
        <span className="font-pixel text-purple-deep">{Math.round(event.score * 100)}%</span>
      </div>
    </a>
  )
}
