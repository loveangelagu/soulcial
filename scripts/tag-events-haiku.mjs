/**
 * Tag events with Claude Haiku — 12-dim personality vector + surface_label /
 * actual_vibe / best_for / not_for / energy / social_intensity / format /
 * interests_served / interests_adjacent.
 *
 * Reads untagged rows from `events` (left-joined against `event_vectors`),
 * calls Haiku with prompt caching for the system prompt, writes to event_vectors.
 *
 * Cost: ~270 events × ~700 tokens ≈ $0.15 total for full backfill.
 *
 * Usage:
 *   node scripts/tag-events-haiku.mjs                # tag everything untagged
 *   node scripts/tag-events-haiku.mjs --max 5        # smoke test
 *   node scripts/tag-events-haiku.mjs --retag <uid>  # force re-tag one
 */
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'

// ─── env ─────────────────────────────────────────────────────────────────────
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } },
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001'

// ─── flags ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const MAX = (() => {
  const i = args.indexOf('--max')
  return i >= 0 ? parseInt(args[i + 1], 10) : Infinity
})()
const RETAG_UID = (() => {
  const i = args.indexOf('--retag')
  return i >= 0 ? args[i + 1] : null
})()

// ─── prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an event-vibe tagger. Given a Bali meetup's name, venue, and description, you output structured tags that capture what the event is *actually* like vs. what it claims to be.

You score events on 12 personality dimensions, each 0.0–1.0. The dimensions describe what kind of person the event resonates with:

- openness: curiosity, novelty-seeking, exploration of ideas
- embodiment: physical presence, body awareness, somatic
- edge_seeking: risk, intensity, leaving comfort zone
- stillness: quiet, slow, contemplative
- expression: creative output, performance, voice
- systems: structure, frameworks, optimization, building
- communion: togetherness, shared space, group energy
- service: helping others, generosity, contribution
- agency: ambition, drive, getting things done
- mystic: spiritual, esoteric, beyond-rational
- tempo: fast pace, high energy (low = slow & meditative)
- status_orientation: networking, prestige, brand-building

Score each dim 0.0–1.0 based on the *vibe* the event delivers, not the surface category. A "yoga class" might be high-stillness/embodiment but a "power vinyasa with biohacker founders" is high-tempo/systems/status.

Format options:
- format: workshop | social | retreat | sport | discussion | party | dinner | sound_bath | ceremony | other

Output ONLY valid JSON matching this schema, no preamble or commentary:

{
  "surface_label": "what it claims to be — the headline category, 2-4 words",
  "actual_vibe": "what it's actually like, one short phrase",
  "personality_vector": {
    "openness": 0.0, "embodiment": 0.0, "edge_seeking": 0.0,
    "stillness": 0.0, "expression": 0.0, "systems": 0.0,
    "communion": 0.0, "service": 0.0, "agency": 0.0,
    "mystic": 0.0, "tempo": 0.0, "status_orientation": 0.0
  },
  "energy": "low|medium|high",
  "social_intensity": "solo|small-group|crowd",
  "format": "workshop|social|retreat|sport|discussion|party|dinner|sound_bath|ceremony|other",
  "interests_served": ["3-8 short tags, lowercase"],
  "interests_adjacent": ["3-5 related tags the description hints at, lowercase"],
  "best_for": "one warm sentence — who shows up and loves this",
  "not_for": "one sentence — who'd hate it"
}`

function buildUserPrompt(event) {
  return `Event name: ${event.name}
Venue: ${event.venue_name ?? 'unknown'}
City: ${event.city ?? 'unknown'}
${event.description ? `\nDescription:\n${event.description}` : '\n(no description available — infer from name + venue)'}`
}

// ─── tag one ─────────────────────────────────────────────────────────────────
async function tagEventOnce(event, timeoutMs = 30000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 700,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: buildUserPrompt(event) }],
      },
      { signal: ctrl.signal },
    )
  } finally {
    clearTimeout(timer)
  }
}

async function tagEvent(event) {
  let res
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await tagEventOnce(event)
      break
    } catch (err) {
      lastErr = err
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  if (!res) throw lastErr

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  // Strip markdown fences if model added them.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    console.error(`  parse error for ${event.uid}:`, cleaned.slice(0, 200))
    throw e
  }

  return {
    uid: event.uid,
    vector: parsed.personality_vector,
    surface_label: parsed.surface_label ?? null,
    actual_vibe: parsed.actual_vibe ?? null,
    energy: parsed.energy ?? null,
    social_intensity: parsed.social_intensity ?? null,
    format: parsed.format ?? null,
    interests_served: parsed.interests_served ?? [],
    interests_adjacent: parsed.interests_adjacent ?? [],
    best_for: parsed.best_for ?? null,
    not_for: parsed.not_for ?? null,
    tagger_model: MODEL,
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  let events
  if (RETAG_UID) {
    const { data, error } = await sb.from('events').select('*').eq('uid', RETAG_UID).limit(1)
    if (error) throw error
    events = data ?? []
  } else {
    // pull events that don't have a vector yet
    const { data: tagged, error: tErr } = await sb.from('event_vectors').select('uid')
    if (tErr) throw tErr
    const taggedSet = new Set(tagged.map((r) => r.uid))

    const { data, error } = await sb.from('events').select('*').order('starts_at', { ascending: true })
    if (error) throw error
    events = data.filter((e) => !taggedSet.has(e.uid)).slice(0, MAX)
  }

  if (events.length === 0) {
    console.log('nothing to tag.')
    return
  }
  console.log(`tagging ${events.length} events...\n`)

  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let inputTokens = 0
  let outputTokens = 0
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    process.stdout.write(`  [${i + 1}/${events.length}] ${e.uid} ${e.name.slice(0, 50)}... `)
    try {
      const tags = await tagEvent(e)
      const { error } = await sb.from('event_vectors').upsert(tags, { onConflict: 'uid' })
      if (error) throw error
      console.log(`✓ ${tags.surface_label} → ${tags.actual_vibe}`)
      succeeded++
    } catch (err) {
      console.log(`✗ ${err.message}`)
      failed++
    }
    // small pacing
    await new Promise((r) => setTimeout(r, 250))
  }

  console.log(`\n✓ tagged ${succeeded} events (${failed} failed).`)
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
