import dynamic from 'next/dynamic'
import type { RankedEvent } from '@/lib/ranking'
import type { ArchetypeId } from '@/lib/avatars'

const EventMapClient = dynamic(() => import('@/components/EventMapClient'), {
  ssr: false,
  loading: () => (
    <div className="event-map rounded-3xl border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] bg-paper flex items-center justify-center text-muted">
      loading map…
    </div>
  ),
})

export function EventMap({
  events,
  pixelSize,
  userArchetype,
}: {
  events: RankedEvent[]
  pixelSize?: number
  userArchetype?: ArchetypeId | string
}) {
  return <EventMapClient events={events} pixelSize={pixelSize} userArchetype={userArchetype} />
}

