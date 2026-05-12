/**
 * End-to-end smoke test of the ranking + tagline pipeline.
 * Simulates loadEvents + userVectors + rankAndGroupByDay for several user
 * interest profiles, plus tagline picking. Run with `node scripts/smoke-test.mjs`.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const DIMS = [
  'openness', 'embodiment', 'edge_seeking', 'stillness', 'expression', 'systems',
  'communion', 'service', 'agency', 'mystic', 'tempo', 'status_orientation',
]

// ─── Load events (mirror lib/supabase.ts) ────────────────────────────────────
const now = new Date().toISOString()
const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const { data } = await sb
  .from('events')
  .select(`
    uid, name, venue_name, starts_at,
    event_vectors (vector, surface_label, actual_vibe, best_for)
  `)
  .gte('starts_at', now)
  .lte('starts_at', weekFromNow)
  .order('starts_at')

const events = (data ?? [])
  .map((e) => {
    const ev = Array.isArray(e.event_vectors) ? e.event_vectors[0] : e.event_vectors
    if (!ev?.vector) return null
    return { ...e, ...ev }
  })
  .filter(Boolean)

console.log(`loaded ${events.length} events`)

// Contrast-boost (mirror lib/supabase.ts)
const mean = {}
for (const d of DIMS) {
  const vs = events.map((e) => e.vector[d]).filter((v) => typeof v === 'number')
  mean[d] = vs.reduce((a, b) => a + b, 0) / vs.length
}
for (const e of events) {
  const out = {}
  for (const d of DIMS) {
    const v = e.vector[d] ?? 0.5
    out[d] = Math.max(0, Math.min(1, (v - mean[d]) * 1.5 + 0.5))
  }
  e.vector = out
}

// ─── Interest vectors (mirror lib/personality/vector.ts) ─────────────────────
const interestData = JSON.parse(
  readFileSync(new URL('../lib/personality/interest-vectors.json', import.meta.url), 'utf8'),
)
const INTEREST_VECTORS = interestData.vectors

function userVectors(interests) {
  const found = interests.map((l) => INTEREST_VECTORS[l]).filter(Boolean)
  const out = {}
  for (const d of DIMS) {
    let sum = 0, count = 0
    for (const v of found) {
      const x = v.personality?.[d]
      if (typeof x === 'number') { sum += x; count++ }
    }
    out[d] = count > 0 ? sum / count : 0.5
  }
  return out
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (const d of DIMS) {
    const av = a[d] ?? 0, bv = b[d] ?? 0
    dot += av * bv
    na += av * av
    nb += bv * bv
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb))
}

const INTEREST_KEYWORDS = {
  'Yoga': ['yoga','flow','asana','vinyasa'],
  'Meditation': ['meditation','mindful','zen'],
  'Breathwork': ['breath','pranayama'],
  'Sound Healing': ['sound','gong','bowl','frequenc'],
  'Cold Plunge': ['cold','plunge','ice','sauna'],
  'Spirituality': ['spiritual','mystic','sacred','soul'],
  'Plant Medicine': ['plant medicine','cacao','mushroom','ayahuasca','ceremony'],
  "Women's Circles": ['circle','feminine','women'],
  'Surfing': ['surf','wave','ocean'],
  'Ecstatic Dance': ['dance','ecstatic','movement'],
  'Pilates': ['pilates'],
  'Hiking': ['hike','hiking','trek','walk','outdoor'],
  'Fitness': ['fitness','workout','training','gym','run'],
  'AI / ML': ['ai','machine learning','ml','llm'],
  'Vibe Coding': ['code','coding','programming','developer'],
  'Startups': ['startup','founder','entrepreneur','building'],
  'SaaS': ['saas','product','software'],
  'Crypto': ['crypto','bitcoin','blockchain','web3','defi'],
  'Art': ['art','paint','creative','craft'],
  'Music': ['music','jam','concert','sing'],
  'Photography': ['photo','photography'],
  'Writing': ['writing','writer','journal'],
  'Design': ['design','creative'],
  'Coffee': ['coffee','cafe'],
  'Cocktails': ['cocktail','bar','drink'],
  'Live Music': ['live music','concert','band','gig'],
  'Nightlife': ['nightlife','party','club','dj'],
  'Cooking': ['cook','food','dinner'],
  'Travel': ['travel','adventure','explore'],
  'Networking': ['network','connect','meet'],
  'Community': ['community','gathering','tribe'],
}

function overlapBoost(e, userKeywords) {
  if (userKeywords.size === 0) return 0
  const haystack = [...(e.interests_served || []), ...(e.interests_adjacent || [])].join(' ').toLowerCase()
  if (!haystack) return 0
  let matches = 0
  for (const kw of userKeywords) if (haystack.includes(kw)) matches++
  return Math.min(0.25, matches * 0.08)
}

// ─── Run for several user profiles ───────────────────────────────────────────
const PROFILES = [
  ['Yoga'],
  ['Surfing'],
  ['AI / ML', 'Startups'],
  ['Yoga', 'Meditation', 'Breathwork'],
  ['Coffee'],
  ['Music', 'Nightlife', 'Cocktails'],
  ['Writing', 'Art', 'Photography'],
]

for (const interests of PROFILES) {
  const user = userVectors(interests)
  const top = (DIMS.map((d) => [d, user[d]]).sort((a, b) => b[1] - a[1])).slice(0, 3)
  console.log(`\n── ${interests.join(' + ')}`)
  console.log(`   top dims: ${top.map(([d, v]) => `${d}=${v.toFixed(2)}`).join(', ')}`)

  const scored = events
    .map((e) => ({ ...e, score: cosine(user, e.vector) }))
    .sort((a, b) => b.score - a.score)
  const min = scored[scored.length - 1].score
  const max = scored[0].score
  console.log(`   score range: ${min.toFixed(2)} → ${max.toFixed(2)}  (spread ${(max - min).toFixed(2)})`)
  console.log(`   top 3 matches:`)
  for (const e of scored.slice(0, 3)) {
    console.log(`     ${(e.score * 100).toFixed(0)}%  ${e.name.slice(0, 50)}`)
    console.log(`            ↳ ${e.actual_vibe}`)
  }
  console.log(`   bottom match:`)
  const bottom = scored[scored.length - 1]
  console.log(`     ${(bottom.score * 100).toFixed(0)}%  ${bottom.name.slice(0, 50)}`)
  console.log(`            ↳ ${bottom.actual_vibe}`)
}
