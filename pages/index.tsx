import { useEffect, useMemo, useState } from 'react'
import { AvatarSprite } from '@/lib/avatars'
import { userVectors } from '@/lib/personality/vector'
import { pickTagline } from '@/lib/tagline'
import { loadEvents, type EventWithVector } from '@/lib/supabase'
import { rankAndGroupByDay } from '@/lib/ranking'
import { InterestPicker } from '@/components/InterestPicker'
import { PersonalityRadar } from '@/components/PersonalityRadar'
import { VibeSlidersUI, DEFAULT_SLIDERS, type VibeSliders } from '@/components/VibeSliders'
import { CalendarGrid } from '@/components/CalendarGrid'
import { downloadIcs } from '@/lib/ics'
import { Hero } from '@/components/Hero'

export default function Home() {
  const [interests, setInterests] = useState<string[]>([])
  const [sliders, setSliders] = useState<VibeSliders>(DEFAULT_SLIDERS)
  const [planRevealed, setPlanRevealed] = useState(false)
  const [events, setEvents] = useState<EventWithVector[]>([])
  const [loading, setLoading] = useState(true)
  const [gcalToken, setGcalToken] = useState<string | null>(null)
  const [gcalStatus, setGcalStatus] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch((e) => console.error('loadEvents failed:', e))
      .finally(() => setLoading(false))
  }, [])

  // Pick up token from OAuth redirect fragment.
  useEffect(() => {
    const m = window.location.hash.match(/gcal_token=([^&]+)/)
    if (m) {
      setGcalToken(decodeURIComponent(m[1]))
      // restore previous selections from localStorage so we can finish the flow
      try {
        const saved = JSON.parse(localStorage.getItem('vibecheck:state') ?? 'null')
        if (saved) {
          setInterests(saved.interests ?? [])
          setSliders(saved.sliders ?? DEFAULT_SLIDERS)
          setPlanRevealed(true)
        }
      } catch {}
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Persist current state so OAuth round-trip can restore it.
  useEffect(() => {
    if (interests.length > 0) {
      localStorage.setItem('vibecheck:state', JSON.stringify({ interests, sliders }))
    }
  }, [interests, sliders])

  const vec = useMemo(() => userVectors(interests).personality, [interests])
  const tagline = useMemo(() => pickTagline(vec), [vec])

  const days = useMemo(
    () => (interests.length === 0 ? [] : rankAndGroupByDay(events, vec, sliders)),
    [events, vec, sliders, interests.length],
  )

  return (
    <main className="min-h-screen bg-cream pb-24">
      {/* Hero */}
      <Hero />

      {/* Step 1 — interest picker */}
      <section className="px-4 mb-8">
        <SectionHeading n={1}>Pick what you're into</SectionHeading>
        <div className="max-w-3xl mx-auto">
          <InterestPicker selected={interests} onChange={setInterests} />
        </div>
      </section>

      {/* Step 2 — personality reveal (only after they pick something) */}
      {interests.length > 0 && (
        <section className="px-4 mb-8">
          <SectionHeading n={2}>Who you are, mathematically</SectionHeading>
          <div className="max-w-3xl mx-auto bg-paper rounded-3xl border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] p-6 flex flex-col md:flex-row items-center gap-6">
            <PersonalityRadar vector={vec} />
            <div className="flex flex-col items-center gap-3">
              <AvatarSprite archetype={tagline.avatar} size={96} />
              <div className="font-pixel text-2xl text-purple-dark text-center max-w-[220px]">
                {tagline.text}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 3 — sliders */}
      {interests.length > 0 && (
        <section className="px-4 mb-8">
          <SectionHeading n={3}>Tune the vibe</SectionHeading>
          <div className="max-w-md mx-auto bg-paper rounded-3xl border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] p-6">
            <VibeSlidersUI values={sliders} onChange={setSliders} />
          </div>
        </section>
      )}

      {/* Step 4 — Plan my week */}
      {interests.length > 0 && !planRevealed && (
        <section className="px-4 mb-12 text-center">
          <button
            onClick={() => setPlanRevealed(true)}
            className="px-8 py-4 rounded-2xl bg-purple-deep text-white font-pixel text-2xl shadow-[0_4px_0_0_#4a2a8a] hover:translate-y-0.5 hover:shadow-[0_2px_0_0_#4a2a8a] transition-all"
          >
            plan my week →
          </button>
        </section>
      )}

      {/* Step 5 — Calendar */}
      {planRevealed && (
        <section className="px-4 mb-12">
          <SectionHeading n={4}>Your week</SectionHeading>
          {loading ? (
            <div className="text-center text-muted">loading events…</div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted">no events tagged yet — run the scraper + tagger first.</div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <CalendarGrid days={days} />
              <div className="text-center mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={async () => {
                    if (gcalToken) {
                      // already authed — push events directly
                      await pushToGoogleCalendar(gcalToken, days, setGcalStatus)
                      return
                    }
                    const r = await fetch('/api/google/start')
                    if (!r.ok) {
                      alert('Google OAuth not configured yet. Use the .ics download instead.')
                      return
                    }
                    const j = await r.json()
                    if (j.url) window.location.href = j.url
                  }}
                  className="px-6 py-3 rounded-2xl bg-purple-deep text-white font-pixel text-xl shadow-[0_3px_0_0_#4a2a8a] hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#4a2a8a] transition-all"
                >
                  add all to google calendar 📅
                </button>
                <button
                  onClick={() => {
                    const all = days.flatMap((d) => d.events)
                    if (all.length === 0) {
                      alert('Nothing to export — pick some interests!')
                      return
                    }
                    downloadIcs('bali-week.ics', all)
                  }}
                  className="px-6 py-3 rounded-2xl bg-paper text-purple-dark font-pixel text-xl border-[3px] border-lavender-pale shadow-[0_3px_0_0_#e9e0ff] hover:translate-y-0.5 hover:shadow-[0_1px_0_0_#e9e0ff] transition-all"
                >
                  or download .ics 💾
                </button>
              </div>
              {gcalStatus && (
                <div className="text-center mt-4 text-sm text-purple-deep font-pixel">{gcalStatus}</div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function SectionHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="font-pixel text-3xl text-purple-dark text-center mb-4">
      <span className="text-purple-primary">{n}.</span> {children}
    </h2>
  )
}

async function pushToGoogleCalendar(
  accessToken: string,
  days: { date: Date; events: import('@/lib/ranking').RankedEvent[] }[],
  setStatus: (s: string | null) => void,
) {
  const all = days.flatMap((d) => d.events)
  if (all.length === 0) {
    setStatus('No events to add — pick some interests first.')
    return
  }
  setStatus(`Adding ${all.length} events to your calendar…`)
  const payload = {
    accessToken,
    events: all.map((e) => {
      const start = new Date(e.starts_at).toISOString()
      const end = (e.ends_at ? new Date(e.ends_at) : new Date(new Date(e.starts_at).getTime() + 60 * 60 * 1000)).toISOString()
      return {
        summary: e.name,
        description: [
          e.actual_vibe && `Actually: ${e.actual_vibe}`,
          e.best_for && `Best for: ${e.best_for}`,
          `Vibe match: ${Math.round(e.score * 100)}%`,
          `Source: https://nomeo.io/m/${e.uid}`,
        ].filter(Boolean).join('\n'),
        location: [e.venue_name, e.city].filter(Boolean).join(', '),
        start,
        end,
      }
    }),
  }
  try {
    const r = await fetch('/api/google/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const j = await r.json()
    if (j.failed > 0) {
      setStatus(`Added ${j.inserted}, ${j.failed} failed. Check console.`)
      console.error('insert failures:', j.results)
    } else {
      setStatus(`✓ Added ${j.inserted} events to your Google Calendar.`)
    }
  } catch (e: any) {
    setStatus(`Error: ${e?.message ?? 'unknown'}`)
  }
}
