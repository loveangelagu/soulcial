import { useEffect, useMemo, useState } from 'react'
import type { RankedEvent } from '@/lib/ranking'
import { formatBaliDay, formatBaliTime } from '@/lib/ranking'

type DayPlan = { date: Date; events: RankedEvent[] }

export function WeeklyPlan({
  days,
  pinned,
  onTogglePin,
  onRelaxFilters,
  onOpenReview,
  onDayChange,
  gcalStatus,
  onExportGoogle,
  onExportIcs,
}: {
  days: DayPlan[]
  pinned: string[]
  onTogglePin: (uid: string) => void
  onRelaxFilters?: () => void
  onOpenReview: () => void
  onDayChange: () => void
  gcalStatus: string | null
  onExportGoogle: () => Promise<void>
  onExportIcs: () => void
}) {
  const todayKey = useMemo(() => baliDayKey(new Date()), [])
  const allEvents = useMemo(() => days.flatMap((d) => d.events), [days])
  const eventByUid = useMemo(
    () => new Map(allEvents.map((event) => [event.uid, event] as const)),
    [allEvents],
  )
  const hiddenPinnedCount = useMemo(
    () => pinned.filter((uid) => !eventByUid.has(uid)).length,
    [pinned, eventByUid],
  )
  const pinnedVisibleEvents = useMemo(
    () => pinned.map((uid) => eventByUid.get(uid)).filter((event): event is RankedEvent => Boolean(event)),
    [pinned, eventByUid],
  )
  const pinnedCount = pinned.length
  const hasEventsThisWeek = allEvents.length > 0

  const initialIndex = useMemo(() => {
    if (days.length === 0) return 0
    const todayIdx = days.findIndex((day) => baliDayKey(day.date) === todayKey)
    return todayIdx >= 0 ? todayIdx : 0
  }, [days, todayKey])

  const [selectedDayIdx, setSelectedDayIdx] = useState(initialIndex)
  const [manuallyNavigated, setManuallyNavigated] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    setSelectedDayIdx((prev) => {
      if (days.length === 0) return 0
      return Math.min(prev, days.length - 1)
    })
  }, [days.length])

  useEffect(() => {
    if (!hasEventsThisWeek || manuallyNavigated || days.length === 0) return
    const todayIdx = days.findIndex((day) => baliDayKey(day.date) === todayKey)
    if (todayIdx < 0) return
    if (days[todayIdx].events.length > 0) {
      setSelectedDayIdx(todayIdx)
      return
    }
    const nextIdx = days.findIndex((day, idx) => idx > todayIdx && day.events.length > 0)
    if (nextIdx >= 0) setSelectedDayIdx(nextIdx)
  }, [days, hasEventsThisWeek, manuallyNavigated, todayKey])

  const selectedDay = days[selectedDayIdx] ?? days[0]
  const onSelectDay = (idx: number) => {
    setManuallyNavigated(true)
    setSelectedDayIdx(idx)
    onDayChange()
  }

  const onOpenReviewSheet = () => {
    onOpenReview()
    setReviewOpen(true)
  }

  if (!hasEventsThisWeek) {
    return (
      <div className="rounded-3xl border-[3px] border-lavender-pale bg-paper/70 p-8 text-center shadow-card">
        <p className="text-lg text-muted">no matches this week.</p>
        {onRelaxFilters && (
          <button
            type="button"
            onClick={onRelaxFilters}
            className="mt-3 text-base text-purple-deep underline underline-offset-4 hover:text-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded"
          >
            relax advanced filters
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative pb-16">
      <WeekStrip
        days={days}
        selectedDayIdx={selectedDayIdx}
        todayKey={todayKey}
        pinnedSet={new Set(pinned)}
        onSelectDay={onSelectDay}
      />
      {selectedDay && (
        <DaySpotlight
          day={selectedDay}
          isToday={baliDayKey(selectedDay.date) === todayKey}
          pinnedSet={new Set(pinned)}
          onTogglePin={onTogglePin}
          onRelaxFilters={onRelaxFilters}
        />
      )}
      <PlanActions
        gcalStatus={gcalStatus}
        onExportGoogle={onExportGoogle}
        onExportIcs={onExportIcs}
      />
      <MyWeekTray
        open={reviewOpen}
        pinnedCount={pinnedCount}
        visiblePinned={pinnedVisibleEvents}
        hiddenPinnedCount={hiddenPinnedCount}
        gcalStatus={gcalStatus}
        onOpen={onOpenReviewSheet}
        onClose={() => setReviewOpen(false)}
        onExportGoogle={onExportGoogle}
        onExportIcs={onExportIcs}
      />
    </div>
  )
}

function WeekStrip({
  days,
  selectedDayIdx,
  todayKey,
  pinnedSet,
  onSelectDay,
}: {
  days: DayPlan[]
  selectedDayIdx: number
  todayKey: string
  pinnedSet: Set<string>
  onSelectDay: (idx: number) => void
}) {
  return (
    <div className="mb-6 overflow-x-auto pb-2">
      <div className="flex w-full justify-center">
        <div
          role="tablist"
          aria-label="Week days"
          className="flex min-w-max gap-3 snap-x snap-mandatory"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
            e.preventDefault()
            const delta = e.key === 'ArrowRight' ? 1 : -1
            const next = Math.max(0, Math.min(days.length - 1, selectedDayIdx + delta))
            if (next !== selectedDayIdx) onSelectDay(next)
          }}
        >
          {days.map((day, idx) => {
            const active = idx === selectedDayIdx
            const isToday = baliDayKey(day.date) === todayKey
            const hasPinned = day.events.some((event) => pinnedSet.has(event.uid))
            const isEmpty = day.events.length === 0
            return (
              <button
                key={day.date.toISOString()}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectDay(idx)}
                className={[
                  'snap-start min-w-[88px] rounded-2xl border-2 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
                  active
                    ? 'bg-lavender-light border-purple-primary text-purple-deep shadow-card-sm'
                    : 'bg-paper border-lavender-pale text-muted hover:text-purple-dark',
                  isToday ? 'ring-2 ring-lavender' : '',
                  isEmpty ? 'opacity-70' : '',
                ].join(' ')}
              >
                <div className="font-pixel text-pixel-base uppercase">{formatBaliDay(day.date).slice(0, 3)}</div>
                <div className="font-pixel text-pixel-3xl leading-tight">{day.date.getDate()}</div>
                <div className="h-3 mt-1">
                  {hasPinned && <span className="inline-block h-2 w-2 rounded-full bg-purple-deep" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PlanActions({
  gcalStatus,
  onExportGoogle,
  onExportIcs,
}: {
  gcalStatus: string | null
  onExportGoogle: () => Promise<void>
  onExportIcs: () => void
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onExportGoogle}
        className="px-8 py-4 rounded-2xl bg-purple-deep text-white font-pixel text-pixel-2xl shadow-press hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#4a2a8a] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
      >
        add to my calendar →
      </button>
      <button
        type="button"
        onClick={onExportIcs}
        className="text-base text-muted hover:text-purple-deep underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded px-2 py-1"
      >
        download week plan (.ics)
      </button>
      {gcalStatus && (
        <p className="mt-2 text-base text-purple-deep font-pixel" role="status" aria-live="polite">
          {gcalStatus}
        </p>
      )}
    </div>
  )
}

function DaySpotlight({
  day,
  isToday,
  pinnedSet,
  onTogglePin,
  onRelaxFilters,
}: {
  day: DayPlan
  isToday: boolean
  pinnedSet: Set<string>
  onTogglePin: (uid: string) => void
  onRelaxFilters?: () => void
}) {
  return (
    <section
      aria-live="polite"
      className="rounded-3xl border-[3px] border-lavender-pale bg-gradient-to-b from-paper to-lavender-light/20 p-6 md:p-8 shadow-card"
    >
      <header className="mb-6 flex items-center justify-between gap-3 border-b-2 border-lavender-pale/70 pb-4">
        <h3 className="font-pixel text-pixel-2xl md:text-pixel-3xl text-purple-dark">
          {day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h3>
        {isToday && (
          <span className="rounded-full bg-lavender-light border-2 border-lavender px-3 py-1.5 text-sm font-pixel text-purple-deep uppercase tracking-wider">
            today
          </span>
        )}
      </header>
      {day.events.length === 0 ? (
        <EmptyDay date={day.date} onRelaxFilters={onRelaxFilters} />
      ) : (
        <div className="space-y-3">
          {day.events.map((event) => (
            <EventRow
              key={event.uid}
              event={event}
              pinned={pinnedSet.has(event.uid)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function EventRow({
  event,
  pinned,
  onTogglePin,
}: {
  event: RankedEvent
  pinned: boolean
  onTogglePin: (uid: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const startsAt = new Date(event.starts_at)
  const mismatch =
    event.surface_label &&
    event.actual_vibe &&
    event.surface_label.toLowerCase() !== event.actual_vibe.toLowerCase()

  return (
    <article
      className={[
        'rounded-2xl border-2 bg-paper shadow-card-sm p-5 transition-all hover:-translate-y-0.5',
        'border-l-[6px]',
        event.score >= 0.75 ? 'border-l-purple-deep' : event.score >= 0.6 ? 'border-l-purple-primary' : 'border-l-lavender',
        'border-r-lavender-pale border-t-lavender-pale border-b-lavender-pale',
      ].join(' ')}
    >
      <div className="flex items-start gap-4">
        {event.poster_url ? (
          <a
            href={`https://nomeo.io/m/${event.uid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 block rounded-xl overflow-hidden border border-lavender-pale bg-lavender-light/20"
            aria-label={`Open ${event.name} on Nomeo`}
          >
            <img
              src={event.poster_url}
              alt={event.name}
              className="h-[76px] w-[76px] object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </a>
        ) : null}
        <div className="shrink-0 font-pixel text-pixel-base text-muted pt-1 min-w-[72px]">
          {formatBaliTime(startsAt)}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
        >
          <div className="font-pixel text-pixel-xl text-purple-dark leading-tight">{event.name}</div>
          <div className="text-base text-muted mt-1.5">
            {[event.venue_name, event.actual_vibe].filter(Boolean).join(' · ')}
          </div>
          {expanded && (
            <div className="text-base text-muted mt-2">
              why: {mismatch ? `on the tin ${event.surface_label}, actually ${event.actual_vibe}` : 'strong profile fit'}
            </div>
          )}
        </button>
        <button
          type="button"
          aria-label={pinned ? 'Remove from my week' : 'Add to my week'}
          onClick={() => onTogglePin(event.uid)}
          className={[
            'shrink-0 rounded-xl border-2 px-3.5 py-2 text-base font-pixel transition-colors min-h-[44px]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary',
            pinned
              ? 'bg-purple-deep text-white border-purple-deep'
              : 'bg-paper text-purple-deep border-lavender hover:bg-lavender-light',
          ].join(' ')}
        >
          {pinned ? 'pinned' : '+ pick'}
        </button>
      </div>
      <div className="mt-3 pt-3 border-t-2 border-lavender-pale/70 flex items-center justify-end">
        <a
          href={`https://nomeo.io/m/${event.uid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl border-2 border-lavender bg-lavender-light/40 px-3.5 py-2 text-base font-pixel text-purple-deep hover:bg-lavender-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
        >
          view event page
        </a>
      </div>
    </article>
  )
}

function EmptyDay({ date, onRelaxFilters }: { date: Date; onRelaxFilters?: () => void }) {
  return (
    <div className="text-lg text-muted">
      <p>no picks for {date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()}.</p>
      {onRelaxFilters && (
        <button
          type="button"
          onClick={onRelaxFilters}
          className="mt-2 text-base text-purple-deep underline underline-offset-4 hover:text-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded"
        >
          relax advanced filters
        </button>
      )}
    </div>
  )
}

function MyWeekTray({
  open,
  pinnedCount,
  visiblePinned,
  hiddenPinnedCount,
  gcalStatus,
  onOpen,
  onClose,
  onExportGoogle,
  onExportIcs,
}: {
  open: boolean
  pinnedCount: number
  visiblePinned: RankedEvent[]
  hiddenPinnedCount: number
  gcalStatus: string | null
  onOpen: () => void
  onClose: () => void
  onExportGoogle: () => Promise<void>
  onExportIcs: () => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, RankedEvent[]>()
    for (const event of visiblePinned) {
      const key = baliDayKey(new Date(event.starts_at))
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [visiblePinned])

  if (pinnedCount === 0) return null

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-20 w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl border-2 border-lavender bg-paper/95 shadow-card p-4 flex items-center justify-between gap-3">
        <div className="text-pixel-base text-purple-deep font-pixel">{pinnedCount} picks this week</div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl bg-purple-deep px-5 py-3 text-pixel-base font-pixel text-white hover:translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
        >
          review
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 px-3 py-6 flex items-end md:items-center justify-center">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-[3px] border-lavender bg-paper p-7 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-pixel text-pixel-2xl text-purple-dark">my week picks</h4>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-base text-muted hover:text-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
              >
                close
              </button>
            </div>
            <div className="space-y-5">
              {grouped.map(([dayKey, events]) => (
                <section key={dayKey}>
                  <div className="font-pixel text-pixel-lg text-purple-deep mb-2">
                    {new Date(`${dayKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <ul className="space-y-1.5">
                    {events.map((event) => (
                      <li key={event.uid} className="text-base text-muted">
                        {formatBaliTime(new Date(event.starts_at))} · {event.name}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {hiddenPinnedCount > 0 && (
              <p className="mt-5 text-sm text-muted">
                {hiddenPinnedCount} pinned event{hiddenPinnedCount === 1 ? '' : 's'} hidden by current filters.
              </p>
            )}
            <div className="mt-7 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onExportGoogle}
                className="px-8 py-4 rounded-2xl bg-purple-deep text-white font-pixel text-pixel-2xl shadow-press hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#4a2a8a] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
              >
                add picks to my calendar →
              </button>
              <button
                type="button"
                onClick={onExportIcs}
                className="text-base text-muted hover:text-purple-deep underline-offset-4 hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded px-2 py-1"
              >
                or download .ics
              </button>
              {gcalStatus && (
                <p className="mt-1 text-base text-purple-deep font-pixel" role="status" aria-live="polite">
                  {gcalStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const BALI_OFFSET_MS = 8 * 60 * 60 * 1000

function baliDayKey(d: Date): string {
  return new Date(d.getTime() + BALI_OFFSET_MS).toISOString().slice(0, 10)
}
