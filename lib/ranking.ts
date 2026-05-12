import {
  cosineSimilarity,
  type PersonalityVec,
} from '@/lib/personality/vector'
import type { EventWithVector } from '@/lib/supabase'
import {
  type Pace,
  paceToEventsPerDay,
  paceToTempoBias,
} from '@/lib/sliders-types'

/**
 * Apply pace to the user's `tempo` dim. That's the entire bias.
 * No social/stretch sliders, no hard filters — pre-filtering kills ranking quality.
 */
export function biasVector(base: PersonalityVec, pace: Pace): PersonalityVec {
  return {
    ...base,
    tempo: lerp(base.tempo, paceToTempoBias(pace), 0.7),
  }
}

function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t
}

export type RankedEvent = EventWithVector & {
  score: number
  why: string
}

export const PLAN_DAYS = 7

/**
 * Rank every event by cosine similarity to the (pace-biased) user vector,
 * bucket by Bali day, and pick the top N per day where N = pace's events-per-day.
 *
 * Returns a 7-day grid starting today (Bali time).
 *
 * `interests` (optional) is the raw user-picked interest labels. When passed,
 * we boost events whose tagger-emitted `interests_served`/`interests_adjacent`
 * strings overlap with any user interest's keywords. This fixes cases where
 * Haiku's vector reading is technically defensible but topically wrong — e.g.
 * a "dating strategy workshop" tagged with high agency/systems/openness
 * shouldn't outrank a literal AI coworking session for an AI/ML picker.
 */
export function rankAndGroupByDay(
  events: EventWithVector[],
  user: PersonalityVec,
  pace: Pace,
  interests: string[] = [],
): { date: Date; events: RankedEvent[] }[] {
  const biased = biasVector(user, pace)
  const userKeywords = interestKeywords(interests)

  // 1) score every event
  const scored: RankedEvent[] = events.map((e) => {
    const cosine = cosineSimilarity(biased, e.vector as any)
    const boost = interestOverlapBoost(e, userKeywords)
    // Clamp so the visible match % never exceeds 99 (looks weirder than honest).
    const score = Math.min(0.99, cosine * (1 + boost))
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

  // 3) build the 7-day grid
  const perDay = paceToEventsPerDay(pace)
  const result: { date: Date; events: RankedEvent[] }[] = []
  const today = baliMidnight(new Date())
  for (let i = 0; i < PLAN_DAYS; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const key = baliDayKey(d)
    const dayEvents = (buckets.get(key) ?? [])
      .sort((a, b) => b.score - a.score)
      .slice(0, perDay)
    result.push({ date: d, events: dayEvents })
  }
  return result
}

// ─── Interest-overlap boost ──────────────────────────────────────────────────

/**
 * Map each user-picked interest label to a set of keyword fragments we look
 * for in the event's tagger-emitted `interests_served` / `interests_adjacent`.
 * Kept small + lowercase; partial substring matches count.
 */
const INTEREST_KEYWORDS: Record<string, string[]> = {
  'Yoga':           ['yoga', 'flow', 'asana', 'vinyasa'],
  'Meditation':     ['meditation', 'mindful', 'zen'],
  'Breathwork':     ['breath', 'pranayama'],
  'Sound Healing':  ['sound', 'gong', 'bowl', 'frequenc'],
  'Cold Plunge':    ['cold', 'plunge', 'ice', 'sauna'],
  'Spirituality':   ['spiritual', 'mystic', 'sacred', 'soul'],
  'Plant Medicine': ['plant medicine', 'cacao', 'mushroom', 'ayahuasca', 'ceremony'],
  "Women's Circles":['circle', 'feminine', 'women'],
  'Surfing':        ['surf', 'wave', 'ocean'],
  'Ecstatic Dance': ['dance', 'ecstatic', 'movement'],
  'Pilates':        ['pilates'],
  'Hiking':         ['hike', 'hiking', 'trek', 'walk', 'outdoor'],
  'Fitness':        ['fitness', 'workout', 'training', 'gym', 'run'],
  'AI / ML':        ['ai', 'machine learning', 'ml', 'llm'],
  'Vibe Coding':    ['code', 'coding', 'programming', 'developer'],
  'Startups':       ['startup', 'founder', 'entrepreneur', 'building'],
  'SaaS':           ['saas', 'product', 'software'],
  'Crypto':         ['crypto', 'bitcoin', 'blockchain', 'web3', 'defi'],
  'Art':            ['art', 'paint', 'creative', 'craft'],
  'Music':          ['music', 'jam', 'concert', 'sing'],
  'Photography':    ['photo', 'photography'],
  'Writing':        ['writing', 'writer', 'journal'],
  'Design':         ['design', 'creative'],
  'Coffee':         ['coffee', 'cafe'],
  'Cocktails':      ['cocktail', 'bar', 'drink'],
  'Live Music':     ['live music', 'concert', 'band', 'gig'],
  'Nightlife':      ['nightlife', 'party', 'club', 'dj'],
  'Cooking':        ['cook', 'food', 'dinner'],
  'Travel':         ['travel', 'adventure', 'explore'],
  'Networking':     ['network', 'connect', 'meet'],
  'Community':      ['community', 'gathering', 'tribe'],
}

function interestKeywords(interests: string[]): Set<string> {
  const set = new Set<string>()
  for (const i of interests) {
    for (const kw of INTEREST_KEYWORDS[i] ?? []) set.add(kw)
  }
  return set
}

function interestOverlapBoost(e: EventWithVector, userKeywords: Set<string>): number {
  if (userKeywords.size === 0) return 0
  const haystack = [
    ...(e.interests_served ?? []),
    ...(e.interests_adjacent ?? []),
  ]
    .join(' ')
    .toLowerCase()
  if (!haystack) return 0
  let matches = 0
  for (const kw of userKeywords) {
    if (haystack.includes(kw)) matches++
  }
  // up to 25% boost when many keywords overlap; tapers off quickly.
  return Math.min(0.25, matches * 0.08)
}

// ─── Bali timezone helpers (UTC+8) ───────────────────────────────────────────

const BALI_OFFSET_MS = 8 * 60 * 60 * 1000

/** Returns YYYY-MM-DD in Bali time. */
export function baliDayKey(d: Date): string {
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
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Makassar',
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
