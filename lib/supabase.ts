/**
 * Supabase client factories.
 * - Browser: anon key, read-only (events + event_vectors)
 * - Server (API routes only): service key, full access
 */

import { createClient } from '@supabase/supabase-js'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL || !ANON) {
  // Don't crash the build — just warn. Pages that need the client will
  // fail noisily at runtime if this is missing.
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
}

export const supabase = createClient(URL ?? '', ANON ?? '')

export type EventWithVector = {
  uid: string
  name: string
  venue_name: string
  city: string
  google_maps_link: string
  poster_url?: string | null
  starts_at: string
  ends_at: string
  vector: Record<string, number>
  surface_label: string
  actual_vibe: string
  energy: 'low' | 'medium' | 'high'
  social_intensity: 'solo' | 'small-group' | 'crowd'
  format: string
  interests_served: string[]
  interests_adjacent: string[]
  best_for: string
  not_for: string
}

export async function loadEvents(): Promise<EventWithVector[]> {
  // 1-hour localStorage cache so slider tweaks don't hammer Supabase.
  // v2 key invalidates any old (pre-contrast-boost) cached payload.
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vibecheck:events')
  }
  const cached = typeof window !== 'undefined' ? localStorage.getItem('vibecheck:events:v2') : null
  if (cached) {
    try {
      const { ts, data } = JSON.parse(cached)
      if (Date.now() - ts < 60 * 60 * 1000) return data
    } catch {}
  }

  const now = new Date().toISOString()
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('events')
    .select(`
      uid, name, venue_name, city, google_maps_link, poster_url, starts_at, ends_at,
      event_vectors (
        vector, surface_label, actual_vibe, energy, social_intensity,
        format, interests_served, interests_adjacent, best_for, not_for
      )
    `)
    .gte('starts_at', now)
    .lte('starts_at', weekFromNow)
    .order('starts_at', { ascending: true })

  if (error) throw error

  const events: EventWithVector[] = (data ?? [])
    .map((e: any) => {
      // event_vectors is a nested object via the left-join (or null for untagged events).
      // Supabase sometimes returns it as an array — handle both.
      const ev = Array.isArray(e.event_vectors) ? e.event_vectors[0] : e.event_vectors
      if (!ev || !ev.vector) return null
      return { ...e, ...ev } as EventWithVector
    })
    .filter((e): e is EventWithVector => Boolean(e))

  // Contrast-boost vectors: subtract per-dim mean, scale, clamp. Haiku's vectors
  // skew toward moderate-everywhere (esp. on `openness` + `communion`), which
  // makes cosine similarity collapse — every event scores ~0.85 against every
  // other. Re-centering on the dataset mean spreads them out for honest ranking.
  contrastBoostVectors(events)

  if (typeof window !== 'undefined') {
    localStorage.setItem('vibecheck:events:v2', JSON.stringify({ ts: Date.now(), data: events }))
  }
  return events
}

const PERSONALITY_DIMS = [
  'openness', 'embodiment', 'edge_seeking', 'stillness', 'expression', 'systems',
  'communion', 'service', 'agency', 'mystic', 'tempo', 'status_orientation',
] as const

function contrastBoostVectors(events: EventWithVector[]): void {
  if (events.length === 0) return

  // 1) compute per-dim mean across the dataset
  const meanByDim: Record<string, number> = {}
  for (const d of PERSONALITY_DIMS) {
    let sum = 0, count = 0
    for (const e of events) {
      const v = e.vector?.[d]
      if (typeof v === 'number') { sum += v; count++ }
    }
    meanByDim[d] = count > 0 ? sum / count : 0.5
  }

  // 2) re-center: v' = clamp((v - mean) * 1.5 + 0.5, 0, 1)
  // The +0.5 anchor keeps "average" events near the middle so cosine still
  // produces a reasonable score; multiplier amplifies above/below-mean values.
  for (const e of events) {
    const out: Record<string, number> = {}
    for (const d of PERSONALITY_DIMS) {
      const v = e.vector?.[d] ?? 0.5
      out[d] = Math.max(0, Math.min(1, (v - meanByDim[d]) * 1.5 + 0.5))
    }
    e.vector = out
  }
}
