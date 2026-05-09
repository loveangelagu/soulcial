export type LatLng = { lat: number; lng: number }

function isValidLatLng(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/**
 * Extract coordinates from common Google Maps URL formats.
 *
 * Supported patterns:
 * - ".../@<lat>,<lng>,<zoom>z/..."
 * - "...!3d<lat>!4d<lng>..." (place/share links often contain this)
 */
export function parseLatLngFromGoogleMapsUrl(url: string | null | undefined): LatLng | null {
  if (!url) return null

  // Pattern 1: @lat,lng
  // Example: https://www.google.com/maps/place/.../@-8.6645483,115.1468978,15z/...
  {
    const m = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (isValidLatLng(lat, lng)) return { lat, lng }
    }
  }

  // Pattern 2: !3dLAT!4dLNG (or reversed)
  {
    const latMatch = url.match(/!3d(-?\d+(?:\.\d+)?)/)
    const lngMatch = url.match(/!4d(-?\d+(?:\.\d+)?)/)
    if (latMatch && lngMatch) {
      const lat = Number(latMatch[1])
      const lng = Number(lngMatch[1])
      if (isValidLatLng(lat, lng)) return { lat, lng }
    }
  }

  return null
}

