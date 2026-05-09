-- vibecheck-bali Supabase schema
-- Paste this whole file into: Supabase dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

-- ─── events: raw event data scraped from Nomeo ───────────────────────────────
create table if not exists events (
  uid              text primary key,
  name             text not null,
  venue_name       text,
  city             text,
  google_maps_link text,
  poster_url       text,
  description      text,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  source           text default 'nomeo',
  source_url       text,
  raw_json         jsonb,
  scraped_at       timestamptz default now()
);

create index if not exists events_starts_at_idx on events(starts_at);

-- ─── event_vectors: Haiku-generated tags + 12-dim personality vector ─────────
create table if not exists event_vectors (
  uid                 text primary key references events(uid) on delete cascade,
  vector              jsonb not null,                    -- {openness: 0.x, ...} 12 dims
  surface_label       text,                              -- "Yoga class"
  actual_vibe         text,                              -- "quiet introspection with strangers"
  energy              text check (energy in ('low','medium','high')),
  social_intensity    text check (social_intensity in ('solo','small-group','crowd')),
  format              text,                              -- workshop|social|retreat|sport|...
  interests_served    text[] default '{}',
  interests_adjacent  text[] default '{}',
  best_for            text,
  not_for             text,
  tagger_model        text default 'claude-haiku-4-5-20251001',
  tagged_at           timestamptz default now()
);

-- ─── RLS: anon can read, only service_role can write ─────────────────────────
alter table events         enable row level security;
alter table event_vectors  enable row level security;

drop policy if exists "anon read events"        on events;
drop policy if exists "anon read event_vectors" on event_vectors;

create policy "anon read events"
  on events for select
  to anon, authenticated
  using (true);

create policy "anon read event_vectors"
  on event_vectors for select
  to anon, authenticated
  using (true);

-- (writes from scripts use the service_role key, which bypasses RLS.)
