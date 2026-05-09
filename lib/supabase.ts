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
  // 1-hour localStorage cache so slider tweaks don't hammer Supabase
  const cached = typeof window !== 'undefined' ? localStorage.getItem('vibecheck:events') : null
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
      uid, name, venue_name, city, google_maps_link, starts_at, ends_at,
      event_vectors (
        vector, surface_label, actual_vibe, energy, social_intensity,
        format, interests_served, interests_adjacent, best_for, not_for
      )
    `)
    .gte('starts_at', now)
    .lte('starts_at', weekFromNow)
    .order('starts_at', { ascending: true })

  if (error) throw error

  const events: EventWithVector[] = (data ?? []).map((e: any) => ({
    ...e,
    ...e.event_vectors,
  }))

  if (typeof window !== 'undefined') {
    localStorage.setItem('vibecheck:events', JSON.stringify({ ts: Date.now(), data: events }))
  }
  return events
}
