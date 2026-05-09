/**
 * Personality vector math.
 * Build a user vector from their interests, then compute cosine similarity
 * against event vectors that the Haiku tagger produced on the same 12 dims.
 *
 * Paste this verbatim into `lib/personality/vector.ts` in the new repo.
 * Pair it with `interest-vectors.json` (separate paste).
 */

import vectorsJson from './interest-vectors.json'

// ─── 12 personality dimensions ────────────────────────────────────────────────

export const PERSONALITY_DIMS = [
  'openness', 'embodiment', 'edge_seeking', 'stillness', 'expression', 'systems',
  'communion', 'service', 'agency', 'mystic', 'tempo', 'status_orientation',
] as const

export type PersonalityDim = typeof PERSONALITY_DIMS[number]
export type PersonalityVec = Record<PersonalityDim, number>

// ─── Static data ─────────────────────────────────────────────────────────────

type RawInterestEntry = {
  personality: PersonalityVec
  // collaboration + curiosity blocks exist in source but unused here
}

const RAW = vectorsJson as { vectors: Record<string, RawInterestEntry> }
export const INTEREST_VECTORS: Record<string, RawInterestEntry> = RAW.vectors ?? {}

// ─── User vector construction ────────────────────────────────────────────────

function meanVec(vecs: PersonalityVec[]): PersonalityVec {
  const out = {} as PersonalityVec
  for (const d of PERSONALITY_DIMS) {
    let sum = 0, count = 0
    for (const v of vecs) {
      const x = v[d]
      if (typeof x === 'number') { sum += x; count++ }
    }
    out[d] = count > 0 ? sum / count : 0.5
  }
  return out
}

/** Build a user's personality vector from their interest labels. */
export function userVectors(interests: string[]): { personality: PersonalityVec } {
  const found = interests.map(l => INTEREST_VECTORS[l]).filter(Boolean)
  if (found.length === 0) {
    return {
      personality: Object.fromEntries(
        PERSONALITY_DIMS.map(d => [d, 0.5])
      ) as PersonalityVec,
    }
  }
  return { personality: meanVec(found.map(v => v.personality)) }
}

// ─── Cosine similarity ───────────────────────────────────────────────────────

function vecValues(v: PersonalityVec): number[] {
  return PERSONALITY_DIMS.map(d => v[d] ?? 0)
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a))
}

/** Cosine similarity in [0, 1] for non-negative vectors. */
export function cosineSimilarity(
  a: PersonalityVec,
  b: PersonalityVec | Record<string, number>,
  _dims?: readonly string[],
): number {
  const av = vecValues(a)
  const bv = PERSONALITY_DIMS.map(d => (b as any)[d] ?? 0)
  const na = norm(av), nb = norm(bv)
  if (na === 0 || nb === 0) return 0
  return Math.max(0, Math.min(1, dot(av, bv) / (na * nb)))
}
