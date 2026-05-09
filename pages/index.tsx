import { useEffect, useMemo, useState } from 'react'
import { AvatarSprite } from '@/lib/avatars'
import { userVectors } from '@/lib/personality/vector'
import { pickTagline } from '@/lib/tagline'
import { loadEvents, type EventWithVector } from '@/lib/supabase'
import { rankAndGroupByDay, type RankedEvent } from '@/lib/ranking'
import { InterestPicker } from '@/components/InterestPicker'
import { PersonalityRadar } from '@/components/PersonalityRadar'
import { DEFAULT_SLIDERS, migrateSliders, type VibeSliders } from '@/components/VibeSliders'
import { VibeTuner } from '@/components/VibeTuner'
import { WeeklyPlan } from '@/components/WeeklyPlan'
import { downloadIcs } from '@/lib/ics'
import { Hero } from '@/components/Hero'
import { startPlanSession, trackExportClick, trackPin, trackReviewSheetOpen, trackSpotlightDayChange, trackZeroResultRecovery } from '@/lib/uxMetrics'
import { usePinnedEvents } from '@/lib/myWeek'

export default function Home() {
  const [interests, setInterests] = useState<string[]>([])
  const [sliders, setSliders] = useState<VibeSliders>(DEFAULT_SLIDERS)
  const [events, setEvents] = useState<EventWithVector[]>([])
  const [loading, setLoading] = useState(true)
  const [gcalToken, setGcalToken] = useState<string | null>(null)
  const [gcalStatus, setGcalStatus] = useState<string | null>(null)
  const { pinned, togglePin } = usePinnedEvents()

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch((e) => console.error('loadEvents failed:', e))
      .finally(() => setLoading(false))
  }, [])

  // Restore prior session on first load (used both by OAuth round-trip and
  // by plain refreshes). `migrateSliders` fills in any newly-added fields so
  // returning users with an older `vibecheck:state` shape don't break.
  useEffect(() => {
    const m = window.location.hash.match(/gcal_token=([^&]+)/)
    if (m) {
      setGcalToken(decodeURIComponent(m[1]))
      window.history.replaceState({}, '', '/')
    }
    try {
      const saved = JSON.parse(localStorage.getItem('vibecheck:state') ?? 'null')
      if (saved) {
        if (Array.isArray(saved.interests)) setInterests(saved.interests)
        setSliders(migrateSliders(saved.sliders))
      }
    } catch {}
  }, [])

  // Persist current state so OAuth round-trip can restore it.
  useEffect(() => {
    if (interests.length > 0) {
      localStorage.setItem('vibecheck:state', JSON.stringify({ interests, sliders }))
      startPlanSession()
    }
  }, [interests, sliders])

  const vec = useMemo(() => userVectors(interests).personality, [interests])
  const tagline = useMemo(() => pickTagline(vec), [vec])

  const days = useMemo(
    () => (interests.length === 0 ? [] : rankAndGroupByDay(events, vec, sliders)),
    [events, vec, sliders, interests.length],
  )
  const rankedByUid = useMemo(
    () => new Map(days.flatMap((d) => d.events).map((e) => [e.uid, e] as const)),
    [days],
  )
  const eventByUid = useMemo(() => new Map(events.map((e) => [e.uid, e] as const)), [events])
  const pinnedEvents = useMemo(
    () =>
      pinned
        .map((uid) => {
          const ranked = rankedByUid.get(uid)
          if (ranked) return ranked
          const fallback = eventByUid.get(uid)
          if (!fallback) return null
          return { ...fallback, score: 0, why: '' }
        })
        .filter((e): e is RankedEvent => Boolean(e)),
    [pinned, rankedByUid, eventByUid],
  )
  const weekEvents = useMemo(() => days.flatMap((d) => d.events), [days])
  const exportEvents = pinnedEvents.length > 0 ? pinnedEvents : weekEvents

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

      {/* Step 3 — tune your week */}
      {interests.length > 0 && (
        <section className="px-4 mb-8">
          <SectionHeading n={3}>Tune your week</SectionHeading>
          <div className="max-w-2xl mx-auto bg-paper rounded-3xl border-[3px] border-lavender-pale shadow-[0_4px_0_0_#e9e0ff] p-6">
            <VibeTuner values={sliders} onChange={setSliders} previewDays={days} />
          </div>
        </section>
      )}

      {/* Step 4 — Your plan (shown automatically once interests are picked;
          the live preview in step 3 already gave the user a glimpse) */}
      {interests.length > 0 && (
        <section className="px-4 mb-12">
          <SectionHeading n={4}>Your week</SectionHeading>
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center text-muted">loading events…</div>
            ) : events.length === 0 ? (
              <div className="text-center text-muted">no events tagged yet — run the scraper + tagger first.</div>
            ) : (
              <>
                <WeeklyPlan
                  days={days}
                  pinned={pinned}
                  onTogglePin={(uid) => {
                    trackPin(uid)
                    togglePin(uid)
                  }}
                  onRelaxFilters={() =>
                    {
                      trackZeroResultRecovery()
                      setSliders((prev) => ({
                        ...prev,
                        timeOfDay: ['morning', 'afternoon', 'evening', 'night'],
                        daysAvailable: [0, 1, 2, 3, 4, 5, 6],
                        energyFloor: 'any',
                        groupSize: 'any',
                      }))
                    }
                  }
                  onOpenReview={trackReviewSheetOpen}
                  onDayChange={trackSpotlightDayChange}
                  gcalStatus={gcalStatus}
                  onExportGoogle={async () => {
                    trackExportClick()
                    if (gcalToken) {
                      await pushToGoogleCalendar(gcalToken, exportEvents, setGcalStatus)
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
                  onExportIcs={() => {
                    trackExportClick()
                    downloadIcs('bali-week.ics', exportEvents)
                  }}
                />
              </>
            )}
          </div>
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
  selectedEvents: Array<{
    uid: string
    starts_at: string
    ends_at: string | null
    name: string
    actual_vibe?: string | null
    best_for?: string | null
    score?: number
    venue_name?: string | null
    city?: string | null
  }>,
  setStatus: (s: string | null) => void,
) {
  if (selectedEvents.length === 0) {
    setStatus('No picks yet — add a few events first.')
    return
  }
  setStatus(`Adding ${selectedEvents.length} events to your calendar…`)
  const payload = {
    accessToken,
    events: selectedEvents.map((e) => {
      const start = new Date(e.starts_at).toISOString()
      const end = (e.ends_at ? new Date(e.ends_at) : new Date(new Date(e.starts_at).getTime() + 60 * 60 * 1000)).toISOString()
      return {
        summary: e.name,
        description: [
          e.actual_vibe && `Actually: ${e.actual_vibe}`,
          e.best_for && `Best for: ${e.best_for}`,
          typeof e.score === 'number' ? `Vibe match: ${Math.round(e.score * 100)}%` : null,
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
