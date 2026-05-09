import dynamic from 'next/dynamic'
import type { RankedEvent } from '@/lib/ranking'

const EventMapClient = dynamic(() => import('@/components/EventMapClient'), {
  ssr: false,
  loading: () => (
    <div className="event-map rounded-3xl border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] bg-paper flex items-center justify-center text-muted">
      loading map…
    </div>
  ),
})

export function EventMap({ events, pixelSize }: { events: RankedEvent[]; pixelSize?: number }) {
  return <EventMapClient events={events} pixelSize={pixelSize} />
}

