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
