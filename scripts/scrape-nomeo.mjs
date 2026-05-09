/**
 * Scrape Nomeo meetups list + detail descriptions, upsert into Supabase.
 *
 * Usage:
 *   node scripts/scrape-nomeo.mjs              # backfill all reachable
 *   node scripts/scrape-nomeo.mjs --max 60     # cap the pulls
 *   node scripts/scrape-nomeo.mjs --upcoming   # stop at the first event in the past
 *
 * Stealth: real browser UA, 1.5–3s jitter between detail fetches, indistinguishable
 * from one curious user. Single stable IP.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// ─── env ─────────────────────────────────────────────────────────────────────
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) process.env[m[1]] = m[2]
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing Supabase env vars')

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ─── flags ───────────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2))
const MAX = (() => {
  const i = process.argv.indexOf('--max')
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : Infinity
})()
const INCLUDE_PAST = args.has('--past')   // by default we only scrape upcoming

// ─── http ────────────────────────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const jitter = () => 1500 + Math.random() * 1500   // 1.5–3.0s

async function fetchList(offset, { isFuture = true } = {}) {
  const r = await fetch('https://nomeo.io/api/meetups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ offset, isFuture, country: 'Indonesia', state: 'Bali' }),
  })
  if (!r.ok) throw new Error(`list offset=${offset}: ${r.status}`)
  return r.json()
}

async function fetchDescription(uid) {
  const r = await fetch(`https://nomeo.io/m/${uid}`, {
    headers: { 'User-Agent': UA },
  })
  if (!r.ok) return null
  const html = await r.text()
  const m = html.match(/<meta property="og:description" content="([^"]*)"/)
  if (!m) return null
  return m[1]
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function posterUrl(poster) {
  if (!poster) return null
  if (poster.startsWith('http')) return poster
  if (poster.startsWith('cf-')) {
    return `https://imagedelivery.net/9IR5wiIm2ih7Lx05_bto6Q/${poster.slice(3)}/public`
  }
  if (poster.startsWith('/img/')) return `https://nomeo.io${poster}`
  return null
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const seen = new Set()
  const collected = []
  let offset = 0
  let stop = false

  while (!stop && collected.length < MAX) {
    process.stdout.write(`list offset=${offset}... `)
    const data = await fetchList(offset, { isFuture: !INCLUDE_PAST })
    // pinned_meetups only on first page; merge them in once
    const meetups = [
      ...(offset === 0 ? (data.pinned_meetups ?? []) : []),
      ...(data.meetups ?? []),
    ]
    if (meetups.length === 0) {
      console.log('empty page, done.')
      break
    }
    let added = 0
    for (const m of meetups) {
      if (seen.has(m.uid)) continue
      seen.add(m.uid)
      collected.push(m)
      added++
      if (collected.length >= MAX) break
    }
    console.log(`+${added} (total ${collected.length})`)
    offset += 10
    await sleep(jitter())
  }

  console.log(`\nfetching descriptions for ${collected.length} meetups...`)
  for (let i = 0; i < collected.length; i++) {
    const m = collected[i]
    process.stdout.write(`  [${i + 1}/${collected.length}] ${m.uid} ${m.name.slice(0, 50)}... `)
    const description = await fetchDescription(m.uid)
    m._description = description
    console.log(description ? `(${description.length} chars)` : 'no desc')
    await sleep(jitter())
  }

  console.log(`\nupserting ${collected.length} events into Supabase...`)
  const rows = collected.map((m) => ({
    uid: m.uid,
    name: m.name,
    venue_name: m.venue_name ?? null,
    city: m.city ?? null,
    google_maps_link: m.google_maps_link ?? null,
    poster_url: posterUrl(m.poster),
    description: m._description ?? null,
    starts_at: m.timestamp,
    ends_at: m.ending_timestamp ?? null,
    source: 'nomeo',
    source_url: `https://nomeo.io/m/${m.uid}`,
    raw_json: m,
  }))

  // chunk to be safe
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50)
    const { error } = await sb.from('events').upsert(chunk, { onConflict: 'uid' })
    if (error) {
      console.error('  upsert error:', error.message)
      throw error
    }
    console.log(`  upserted ${i + chunk.length}/${rows.length}`)
  }

  console.log('\n✓ scrape complete.')
}

main().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
