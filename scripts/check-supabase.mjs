import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
console.log('URL:', url ? 'set' : 'MISSING')
console.log('ANON:', anon ? 'set (' + anon.slice(0, 14) + '...)' : 'MISSING')
console.log()

const sb = createClient(url, anon)

const { data: events, error: eErr, count: eCount } = await sb
  .from('events').select('*', { count: 'exact' }).limit(3)
console.log('events:', eErr ? `ERROR: ${eErr.message}` : `OK (${eCount} rows)`)
if (events?.length) console.log('  cols:', Object.keys(events[0]).join(', '))

const { data: vecs, error: vErr, count: vCount } = await sb
  .from('event_vectors').select('*', { count: 'exact' }).limit(1)
console.log('event_vectors:', vErr ? `ERROR: ${vErr.message}` : `OK (${vCount} rows)`)
if (vecs?.length) console.log('  cols:', Object.keys(vecs[0]).join(', '))

// ─── Vector discrimination stats ─────────────────────────────────────────────

const { data: allVecs } = await sb.from('event_vectors').select('vector')
if (!allVecs?.length) {
  console.log('\n(no vectors to analyze)')
  process.exit(0)
}

const DIMS = [
  'openness', 'embodiment', 'edge_seeking', 'stillness', 'expression', 'systems',
  'communion', 'service', 'agency', 'mystic', 'tempo', 'status_orientation',
]

console.log(`\nvector stats across ${allVecs.length} events:`)
console.log('dim                  | mean | std  | min  | max  | <0.2 | >0.7')
console.log('-'.repeat(70))

const meanByDim = {}
const stdByDim = {}
for (const d of DIMS) {
  const vals = allVecs.map((r) => r.vector?.[d]).filter((v) => typeof v === 'number')
  if (vals.length === 0) continue
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
  const lo = vals.filter((v) => v < 0.2).length
  const hi = vals.filter((v) => v > 0.7).length
  meanByDim[d] = mean
  stdByDim[d] = std
  console.log(
    d.padEnd(20),
    '|',
    mean.toFixed(2),
    '|',
    std.toFixed(2),
    '|',
    Math.min(...vals).toFixed(2),
    '|',
    Math.max(...vals).toFixed(2),
    '|',
    String(lo).padStart(3),
    '|',
    String(hi).padStart(3),
  )
}

// Average random-pair cosine similarity (sample 200 pairs)
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

const N = allVecs.length
const samples = []
const sampleCount = Math.min(200, N * (N - 1) / 2)
for (let i = 0; i < sampleCount; i++) {
  const a = allVecs[Math.floor(Math.random() * N)].vector
  const b = allVecs[Math.floor(Math.random() * N)].vector
  if (a !== b) samples.push(cosine(a, b))
}
const pairMean = samples.reduce((a, b) => a + b, 0) / samples.length
const pairMin = Math.min(...samples)
const pairMax = Math.max(...samples)
console.log()
console.log(`random-pair cosine similarity (${samples.length} pairs):`)
console.log(`  mean ${pairMean.toFixed(3)}  min ${pairMin.toFixed(3)}  max ${pairMax.toFixed(3)}`)

// Verdict
const meanStd = DIMS.reduce((s, d) => s + (stdByDim[d] ?? 0), 0) / DIMS.length
console.log()
console.log('verdict:')
console.log(`  pair cosine mean: ${pairMean.toFixed(2)}  ← target < 0.70  ${pairMean < 0.7 ? '✓' : '✗'}`)
console.log(`  per-dim std avg:  ${meanStd.toFixed(2)}  ← target > 0.25  ${meanStd > 0.25 ? '✓' : '✗'}`)
