import { useEffect, useMemo, useState } from 'react'
import { AvatarSprite } from '@/lib/avatars'
import { userVectors } from '@/lib/personality/vector'
import { pickTagline } from '@/lib/tagline'
import { loadEvents, type EventWithVector } from '@/lib/supabase'
import { rankAndGroupByDay } from '@/lib/ranking'
import { InterestPicker } from '@/components/InterestPicker'
import { PersonalityRadar } from '@/components/PersonalityRadar'
import { PaceDial } from '@/components/PaceDial'
import { DEFAULT_PACE, type Pace } from '@/lib/sliders-types'
import { WeeklyPlan } from '@/components/WeeklyPlan'
import { downloadIcs } from '@/lib/ics'
import { Hero } from '@/components/Hero'
import { EventMap } from '@/components/EventMap'

export default function Home() {
  const [interests, setInterests] = useState<string[]>([])
  const [pace, setPace] = useState<Pace>(DEFAULT_PACE)
  const [events, setEvents] = useState<EventWithVector[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch((e) => console.error('loadEvents failed:', e))
      .finally(() => setLoading(false))
  }, [])

  // Restore saved session (interests + pace) on first load.
  // `vibecheck:state:v2` is the v2 schema. Any older v1 key is dropped.
  useEffect(() => {
    try {
      localStorage.removeItem('vibecheck:state')
      const saved = JSON.parse(localStorage.getItem('vibecheck:state:v2') ?? 'null')
      if (saved) {
        if (Array.isArray(saved.interests)) setInterests(saved.interests)
        if (saved.pace === 'slow' || saved.pace === 'mixed' || saved.pace === 'busy') {
          setPace(saved.pace)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (interests.length > 0) {
      localStorage.setItem('vibecheck:state:v2', JSON.stringify({ interests, pace }))
    }
  }, [interests, pace])

  const vec = useMemo(() => userVectors(interests).personality, [interests])
  const tagline = useMemo(() => pickTagline(vec), [vec])

  const days = useMemo(
    () => (interests.length === 0 ? [] : rankAndGroupByDay(events, vec, pace, interests)),
    [events, vec, pace, interests],
  )
  const weekEvents = useMemo(() => days.flatMap((d) => d.events), [days])

  const hasInterests = interests.length > 0
  const hasPlan = hasInterests && !loading && events.length > 0

  return (
    <main className="min-h-screen bg-cream pb-24">
      <Hero />

      <Section title="What are you into?">
        <InterestPicker selected={interests} onChange={setInterests} />
      </Section>

      <Reveal when={hasInterests}>
        <Section title="Here's what we read in your vibe.">
          <div className="bg-paper rounded-3xl border-[3px] border-lavender-pale shadow-card p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <PersonalityRadar vector={vec} />
            <div className="flex flex-col items-center gap-4">
              <AvatarSprite archetype={tagline.avatar} size={112} />
              <div className="font-pixel text-pixel-xl sm:text-pixel-2xl md:text-pixel-3xl text-purple-dark text-center max-w-[280px]">
                {tagline.text}
              </div>
            </div>
          </div>
        </Section>
      </Reveal>

      <Reveal when={hasInterests}>
        <Section title="How packed should your week be?">
          <PaceDial value={pace} onChange={setPace} />
        </Section>
      </Reveal>

      <Reveal when={hasInterests}>
        <Section title="Your Bali week." wide>
          {loading ? (
            <div className="text-center text-muted text-lg">loading events…</div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted text-lg">
              no events tagged yet — run the scraper + tagger first.
            </div>
          ) : (
            <WeeklyPlan days={days} />
          )}
        </Section>
      </Reveal>

      <Reveal when={hasPlan}>
        <Section title="On the map." wide>
          <div className="relative isolate">
            <EventMap events={weekEvents} pixelSize={1} userArchetype={tagline.avatar} />
          </div>
        </Section>
      </Reveal>

      <Reveal when={hasPlan}>
        <Section title="Take it with you.">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (weekEvents.length === 0) return
                downloadIcs('bali-week.ics', weekEvents)
              }}
              className="px-6 py-4 min-h-[56px] rounded-2xl bg-purple-deep text-white font-pixel text-pixel-xl shadow-card hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary"
            >
              download .ics 💾
            </button>
            <p className="text-xs text-muted text-center max-w-sm">
              imports into Google Calendar, Apple Calendar, Outlook — anywhere.
            </p>
          </div>
        </Section>
      </Reveal>

      <footer className="px-4 pt-8 pb-12 max-w-2xl mx-auto text-center text-sm text-muted">
        <p>
          we read what events are <em>actually</em> like — not what they call
          themselves — and match them to your vibe. data from{' '}
          <a
            className="underline underline-offset-4 hover:text-purple-deep"
            href="https://nomeo.io/meetups"
            target="_blank"
            rel="noopener noreferrer"
          >
            nomeo
          </a>.
        </p>
      </footer>
    </main>
  )
}

function Section({
  title,
  wide,
  children,
}: {
  title: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="px-4 mb-14 sm:mb-16">
      <h2 className="font-pixel text-pixel-2xl sm:text-pixel-3xl md:text-pixel-4xl text-purple-dark text-center mb-6 md:mb-8 px-2">
        {title}
      </h2>
      <div className={wide ? 'max-w-7xl mx-auto' : 'max-w-3xl mx-auto'}>
        {children}
      </div>
    </section>
  )
}

/**
 * Wraps a section in a soft fade-in/slide-up so unlocked sections appear
 * gracefully rather than popping in. Unmounts when `when` is false so
 * heavy children (e.g. the map) don't render before they're needed.
 */
function Reveal({ when, children }: { when: boolean; children: React.ReactNode }) {
  if (!when) return null
  return (
    <div className="animate-reveal">
      {children}
      <style jsx global>{`
        @keyframes reveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-reveal {
          animation: reveal 240ms ease-out;
        }
      `}</style>
    </div>
  )
}
