import {
  PERSONALITY_DIMS,
  cosineSimilarity,
  type PersonalityVec,
} from '@/lib/personality/vector'
import type { EventWithVector } from '@/lib/supabase'
import type { VibeSliders } from '@/components/VibeSliders'

/**
 * Apply slider biases to a base personality vector.
 *
 * - tempo:   blends `tempo` dim toward the slider value
 * - social:  blends `communion` + `expression` up, `stillness` down (or vice versa)
 * - stretch: blends `edge_seeking` + `openness` toward slider value
 */
export function biasVector(base: PersonalityVec, sliders: VibeSliders): PersonalityVec {
  const out: PersonalityVec = { ...base }

  // strong override on tempo (this slider is THE tempo dimension)
  out.tempo = lerp(base.tempo, sliders.tempo, 0.7)

  // social = boost communion + expression, suppress stillness
  out.communion  = lerp(base.communion,  sliders.social, 0.45)
  out.expression = lerp(base.expression, sliders.social, 0.30)
  out.stillness  = lerp(base.stillness,  1 - sliders.social, 0.45)

  // stretch slider boosts edge_seeking + openness
  out.edge_seeking = lerp(base.edge_seeking, sliders.stretch, 0.55)
  out.openness     = lerp(base.openness,     sliders.stretch, 0.30)

  return out
}

function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t
}

export type RankedEvent = EventWithVector & {
  score: number
  why: string
}

/**
 * Rank events by cosine similarity to the user's biased vector, then
 * group by day-of-week and pick top N per day based on tempo (slow=1/day,
 * fast=3/day).
 *
 * Returns events for the next 7 days.
 */
export function rankAndGroupByDay(
  events: EventWithVector[],
  user: PersonalityVec,
  sliders: VibeSliders,
): { date: Date; events: RankedEvent[] }[] {
  const biased = biasVector(user, sliders)

  // 1) score every event
  const scored: RankedEvent[] = events.map((e) => {
    const score = cosineSimilarity(biased, e.vector as any)
    return { ...e, score, why: e.best_for ?? '' }
  })

  // 2) bucket by Bali-day (UTC+8)
  const buckets = new Map<string, RankedEvent[]>()
  for (const e of scored) {
    const key = baliDayKey(new Date(e.starts_at))
    const arr = buckets.get(key) ?? []
    arr.push(e)
    buckets.set(key, arr)
  }

  // 3) decide events-per-day from tempo slider: 1 (slow) → 3 (fast)
  const perDay = Math.max(1, Math.round(1 + sliders.tempo * 2))

  // 4) build a 7-day grid starting today (Bali time)
  const result: { date: Date; events: RankedEvent[] }[] = []
  const today = baliMidnight(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const key = baliDayKey(d)
    const dayEvents = (buckets.get(key) ?? [])
      .sort((a, b) => b.score - a.score)
      .slice(0, perDay)
    result.push({ date: d, events: dayEvents })
  }
  return result
}

// ─── Bali timezone helpers (UTC+8) ───────────────────────────────────────────

const BALI_OFFSET_MS = 8 * 60 * 60 * 1000

/** Returns YYYY-MM-DD in Bali time. */
function baliDayKey(d: Date): string {
  const shifted = new Date(d.getTime() + BALI_OFFSET_MS)
  return shifted.toISOString().slice(0, 10)
}

/** Returns the UTC instant corresponding to 00:00 Bali time on the given date. */
function baliMidnight(d: Date): Date {
  const shifted = new Date(d.getTime() + BALI_OFFSET_MS)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - BALI_OFFSET_MS)
}

export function formatBaliDay(d: Date): string {
  // returns e.g. "Fri, May 8"
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Makassar',  // UTC+8, same as Bali
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatBaliTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: '2-digit',
  })
}
