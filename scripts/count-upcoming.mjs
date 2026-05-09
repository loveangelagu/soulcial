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
)
const now = new Date().toISOString()
const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
console.log('Now (UTC):', now)
console.log('Week from (UTC):', weekFromNow)

const { data, count } = await sb
  .from('events')
  .select('uid, name, starts_at, city, venue_name', { count: 'exact' })
  .gte('starts_at', now)
  .lte('starts_at', weekFromNow)
  .order('starts_at')

console.log('\nupcoming-this-week count:', count)
for (const e of (data || []).slice(0, 30)) {
  console.log(`  ${e.starts_at}  ${(e.city || '?').slice(0, 8).padEnd(8)}  ${e.name.slice(0, 60)}`)
}
