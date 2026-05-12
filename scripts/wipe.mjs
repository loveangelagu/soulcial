/**
 * Wipe events + event_vectors tables. Use before a fresh re-scrape.
 * Requires SUPABASE_SERVICE_KEY in .env.local.
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
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } },
)

// event_vectors has FK on events.uid, delete it first
const { error: vErr, count: vCount } = await sb
  .from('event_vectors')
  .delete({ count: 'exact' })
  .neq('uid', '__none__')
console.log('event_vectors:', vErr ? `ERROR: ${vErr.message}` : `deleted ${vCount} rows`)

const { error: eErr, count: eCount } = await sb
  .from('events')
  .delete({ count: 'exact' })
  .neq('uid', '__none__')
console.log('events:        ', eErr ? `ERROR: ${eErr.message}` : `deleted ${eCount} rows`)
