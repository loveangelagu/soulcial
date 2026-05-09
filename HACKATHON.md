# vibecheck-bali — hackathon handoff

State as of end-of-night before hackathon. Pick up here tomorrow.

## What's done

### Data pipeline (working, run end-to-end)
- **Supabase schema** applied — `events` + `event_vectors` tables, RLS read-only for anon. See [scripts/schema.sql](scripts/schema.sql).
- **Nomeo scraper** — [scripts/scrape-nomeo.mjs](scripts/scrape-nomeo.mjs). Walks the `/api/meetups` endpoint with `{isFuture: true, country: "Indonesia", state: "Bali"}`, pulls upcoming events + descriptions, upserts to Supabase. **102 upcoming events scraped.**
- **Haiku tagger** — [scripts/tag-events-haiku.mjs](scripts/tag-events-haiku.mjs). 12-dim personality vector + `surface_label` / `actual_vibe` / `best_for` / `not_for` / energy / social_intensity / format / interests_served / interests_adjacent. Has 30s timeout + 3-retry. Uses prompt caching on the system prompt. Cost: ~$0.15 for full run. **All 102 events tagged.**
- **DB state:** `events: 102 rows`, `event_vectors: 102 rows`. Verify with `node scripts/check-supabase.mjs` and `node scripts/count-upcoming.mjs`.

### Frontend (working, dev server at :3001)
- [pages/index.tsx](pages/index.tsx) — single-page top-to-bottom flow:
  1. **Hero** — animated CSS Canggu strip with walking pixel avatar + event pins ([components/Hero.tsx](components/Hero.tsx))
  2. **Interest picker** — chip grid, 33 interests ([components/InterestPicker.tsx](components/InterestPicker.tsx))
  3. **Personality reveal** — 12-dim radar chart + archetype avatar + tagline ([components/PersonalityRadar.tsx](components/PersonalityRadar.tsx))
  4. **Three sliders** — tempo / social / stretch ([components/VibeSliders.tsx](components/VibeSliders.tsx))
  5. **"Plan my week"** button → reveals calendar
  6. **7-day calendar grid** — top N events per day, each card shows name + actual_vibe + struck-through surface_label + venue + match % ([components/CalendarGrid.tsx](components/CalendarGrid.tsx))
  7. **Add to Google Calendar** + **Download .ics** buttons
- **Ranking** — [lib/ranking.ts](lib/ranking.ts). Slider biases blend into user vector → cosine similarity vs each event → group by Bali day (UTC+8) → top N where N is `1 + tempo*2` (1=slow, 3=fast).
- **.ics export** — [lib/ics.ts](lib/ics.ts). Always works, no OAuth.
- **Google Calendar OAuth** — [pages/api/google/start.ts](pages/api/google/start.ts), [pages/api/google/callback.ts](pages/api/google/callback.ts), [pages/api/google/insert.ts](pages/api/google/insert.ts). Scaffolded; **requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env.local`** to actually run. Falls back to .ics if not configured.

### Env (.env.local)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_KEY`
- ✅ `ANTHROPIC_API_KEY`
- ❌ `GOOGLE_CLIENT_ID` (empty)
- ❌ `GOOGLE_CLIENT_SECRET` (empty)
- ✅ `GOOGLE_REDIRECT_URI` (currently `http://localhost:3000/api/google/callback`, but dev server is on `:3001` — fix tomorrow)

## Tomorrow's punch list

### Must-do (in order)

1. **Smoke-test the page in browser** at http://localhost:3001
   - Hard reload (Cmd+Shift+R) — there were stale-cache compile errors when Hero.tsx was newly created
   - Pick 3-4 interests → confirm radar appears + tagline + avatar
   - Drag sliders → confirm calendar re-ranks live
   - Click "Plan my week" → confirm calendar grid populates with real events
   - Click "Download .ics" → confirm file downloads + opens in Google/Apple Calendar
2. **Set up Google Calendar OAuth** (~15 min)
   - https://console.cloud.google.com → new project (or reuse)
   - Enable Google Calendar API (APIs & Services → Library)
   - Credentials → Create OAuth client ID → Web application
     - Authorized redirect URIs: `http://localhost:3001/api/google/callback` AND your Vercel URL `/api/google/callback`
   - Paste `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `.env.local`
   - **Update `GOOGLE_REDIRECT_URI` to use port 3001** (or kill whatever's on 3000 first)
   - Test the full OAuth flow end-to-end on localhost before doing anything else
3. **Deploy to Vercel**
   - `npm i -g vercel` if not installed; `vercel` from project root
   - Add all env vars in Vercel dashboard (URL, anon key, service key, Anthropic key, Google client/secret, `GOOGLE_REDIRECT_URI=https://<deploy-url>/api/google/callback`)
   - Add the Vercel URL as authorized redirect URI in Google Cloud
   - Test the deployed site once
4. **Screen-record a demo backup** (~3 min walkthrough)
   - Pick interests → see radar → reveal week → export to calendar
   - Save the video locally as fallback if the live demo wifi fails

### Nice-to-have (cut if running over)

- Polish hero animation timing (currently linear walk loop; could ease + add bounce on event-pin pop)
- "Why this fits you" line per event card — currently uses `actual_vibe`; could call Haiku live for a personalized line per (top-archetype × event)
- Show 1-2 *rejected* events with a "we have opinions" reason — e.g., "skipped: the Crypto Networking dinner. You scored 0.3 on status_orientation."
- Loading shimmer on "Plan my week" click
- Avatar walking between events on the calendar (ambitious)

### Known issues / gotchas

- **`loadEvents()` filters by `weekFromNow`** ([lib/supabase.ts](lib/supabase.ts)). Some scraped events are >7 days out (June 7, 21, 28 etc.) and won't appear in the calendar. By design — calendar is "this week."
- **localStorage cache is 1 hour** in `loadEvents()`. If you re-tag events after the page loaded once, hard-reload or clear `vibecheck:events` from localStorage to see new tags.
- **Bali timezone** is UTC+8, hardcoded as `Asia/Makassar` in [lib/ranking.ts](lib/ranking.ts). All day grouping + display uses Bali time. If demoing from another timezone, "today" in the calendar = today in Bali, not the local clock.
- **Dev server is on :3001** because something is on :3000 (you have other Next.js apps in `metverse/`, `namesake/`, etc.). For deploy, doesn't matter.
- **`drop policy if exists`** lines in schema.sql trigger a Supabase warning — safe to confirm.
- **Tagger had a hang** earlier on a 90-char description event. Fixed with a 30s `AbortController` timeout + 3-retry. If you re-scrape and re-tag, watch for any new hangs.

## Re-running the data pipeline

```bash
# wipe and re-pull (don't usually need to do this)
node -e "..."  # see scripts/check-supabase.mjs for the delete pattern

# fresh scrape (only upcoming events)
node scripts/scrape-nomeo.mjs

# tag whatever's untagged
node scripts/tag-events-haiku.mjs

# verify
node scripts/check-supabase.mjs
node scripts/count-upcoming.mjs
```

## Demo flow (90 seconds)

1. Land on page — pixel avatar walking, tagline reads.
2. "I do yoga, breathwork, and surf" — pick 3 chips.
3. **Reveal** — radar fills in, archetype avatar pops, tagline: "You're a brave body."
4. Drag tempo slider to "fast" — calendar reflows, 3 events/day instead of 1.
5. Drag stretch slider — different events bubble up.
6. Click **Plan my week** — week populates with named events, struck-through surface labels, real venue map.
7. Click **Download .ics** (or **Add to Google Calendar** if OAuth works on demo wifi).
8. *"Categories lie. We read what events are actually like and match you on vibe, not labels."*

## Files added/changed today

- [scripts/schema.sql](scripts/schema.sql) — Supabase schema (NEW)
- [scripts/scrape-nomeo.mjs](scripts/scrape-nomeo.mjs) — scraper (NEW)
- [scripts/tag-events-haiku.mjs](scripts/tag-events-haiku.mjs) — tagger (NEW)
- [scripts/check-supabase.mjs](scripts/check-supabase.mjs) — connectivity test (NEW)
- [scripts/count-upcoming.mjs](scripts/count-upcoming.mjs) — sanity-check upcoming events (NEW)
- [components/Hero.tsx](components/Hero.tsx), [components/InterestPicker.tsx](components/InterestPicker.tsx), [components/PersonalityRadar.tsx](components/PersonalityRadar.tsx), [components/VibeSliders.tsx](components/VibeSliders.tsx), [components/CalendarGrid.tsx](components/CalendarGrid.tsx) (NEW)
- [lib/ranking.ts](lib/ranking.ts), [lib/ics.ts](lib/ics.ts) (NEW)
- [pages/index.tsx](pages/index.tsx) — replaced smoke-test scaffold with real flow
- [pages/api/google/start.ts](pages/api/google/start.ts), [pages/api/google/callback.ts](pages/api/google/callback.ts), [pages/api/google/insert.ts](pages/api/google/insert.ts) (NEW)
- [.env.local](.env.local) — added `SUPABASE_SERVICE_KEY` slot (you filled it in)
