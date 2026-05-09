'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, CircleMarker, Tooltip } from 'react-leaflet'
import type { RankedEvent } from '@/lib/ranking'
import { parseLatLngFromGoogleMapsUrl, type LatLng } from '@/lib/geo'
import { PixelatedTileLayer } from '@/components/PixelatedTileLayer'

type EventWithCoords = RankedEvent & { coords: LatLng }

const BALI_CENTER: LatLng = { lat: -8.409518, lng: 115.188919 }

export default function EventMapClient({
  events,
  pixelSize = 10,
}: {
  events: RankedEvent[]
  pixelSize?: number
}) {
  const [center, setCenter] = useState<LatLng>(BALI_CENTER)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
    )
  }, [])

  const withCoords: EventWithCoords[] = useMemo(() => {
    const out: EventWithCoords[] = []
    for (const e of events) {
      const coords = parseLatLngFromGoogleMapsUrl((e as any).google_maps_link)
      if (coords) out.push({ ...(e as any), coords })
    }
    return out
  }, [events])

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div className="event-map rounded-3xl overflow-hidden border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] bg-paper">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={withCoords.length ? 12 : 10}
        scrollWheelZoom
        className="event-map__leaflet"
      >
        <PixelatedTileLayer
          urlTemplate={tileUrl}
          pixelSize={pixelSize}
          opacity={1}
          attribution={'&copy; OpenStreetMap contributors'}
          maxZoom={19}
        />

        {withCoords.map((e) => (
          <CircleMarker
            key={e.uid}
            center={[e.coords.lat, e.coords.lng]}
            radius={7}
            pathOptions={{ color: '#6d28d9', weight: 2, fillColor: '#a78bfa', fillOpacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent>
              <div className="event-map__label">{e.name}</div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}

