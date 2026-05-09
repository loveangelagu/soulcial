'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, CircleMarker, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { RankedEvent } from '@/lib/ranking'
import { parseLatLngFromGoogleMapsUrl, type LatLng } from '@/lib/geo'
import { PixelatedTileLayer } from '@/components/PixelatedTileLayer'
import { getAvatarSVGString, type ArchetypeId } from '@/lib/avatars'
import { useMap } from 'react-leaflet'

type EventWithCoords = RankedEvent & { coords: LatLng }

const BALI_CENTER: LatLng = { lat: -8.409518, lng: 115.188919 }

function FocusOnUser({ userLoc }: { userLoc: LatLng | null }) {
  const map = useMap()
  const didFocus = useRef(false)

  useEffect(() => {
    if (!userLoc) return
    if (didFocus.current) return
    didFocus.current = true
    // Zoom out a bit so they see more context around them.
    map.setView([userLoc.lat, userLoc.lng], Math.min(map.getZoom(), 11), { animate: true })
  }, [map, userLoc])

  return null
}

export default function EventMapClient({
  events,
  pixelSize = 10,
  userArchetype,
}: {
  events: RankedEvent[]
  pixelSize?: number
  userArchetype?: ArchetypeId | string
}) {
  const [center, setCenter] = useState<LatLng>(BALI_CENTER)
  const [userLoc, setUserLoc] = useState<LatLng | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCenter(next)
        setUserLoc(next)
      },
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

  const userIcon = useMemo(() => {
    if (!userArchetype) return null
    const svg = getAvatarSVGString(userArchetype)
    const size = 44
    return L.divIcon({
      html: `<div class="event-map__user-marker">${svg}</div>`,
      className: '', // keep Leaflet from applying default styles
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [userArchetype])

  return (
    <div className="event-map rounded-3xl overflow-hidden border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] bg-paper">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={withCoords.length ? 11 : 9}
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

        <FocusOnUser userLoc={userLoc} />

        {userLoc && userIcon && (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="event-map__label">you</div>
            </Tooltip>
          </Marker>
        )}

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

