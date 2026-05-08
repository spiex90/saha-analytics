-- ============================================================
-- SAHA Analytics — Score & Rank History Tables
-- Migration 0002
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add snapshot_date to creator_snapshots (if not exists)
--    compute-growth cron already uses this column; this is
--    a safety guard for fresh DB setups.
-- ────────────────────────────────────────────────────────────
alter table analytics.creator_snapshots
  add column if not exists snapshot_date date
    generated always as ((taken_at at time zone 'utc')::date) stored;

create index if not exists analytics_creator_snapshots_snapdate_idx
  on analytics.creator_snapshots(creator_id, snapshot_date desc);

-- ────────────────────────────────────────────────────────────
-- 2. creator_growth table (used by compute-growth cron)
--    Create only if it doesn't already exist.
-- ────────────────────────────────────────────────────────────
create table if not exists analytics.creator_growth (
  creator_id       uuid not null references analytics.creators(id) on delete cascade,
  period           text not null,         -- '1d' | '7d' | '30d' | '90d'
  followers_start  bigint not null default 0,
  followers_end    bigint not null default 0,
  computed_at      timestamptz not null default now(),
  primary key (creator_id, period)
);

alter table analytics.creator_growth enable row level security;

create policy if not exists "analytics_creator_growth_read" on analytics.creator_growth
  for select using (
    exists (
      select 1 from analytics.creators c
      where c.id = creator_id and c.approval_status = 'approved'
    ) or public.analytics_is_admin()
  );

create policy if not exists "analytics_creator_growth_write" on analytics.creator_growth
  for all using (public.analytics_is_admin());

-- ────────────────────────────────────────────────────────────
-- 3. creator_daily_scores
--    One row per creator per day. Stores the full SAHA v2
--    score breakdown computed by the compute-scores cron.
-- ────────────────────────────────────────────────────────────
create table if not exists analytics.creator_daily_scores (
  id                bigserial primary key,
  creator_id        uuid not null references analytics.creators(id) on delete cascade,
  saha_score        numeric(5,2) not null default 0,
  growth_score      numeric(5,2) not null default 0,
  momentum_score    numeric(5,2) not null default 0,
  consistency_score numeric(5,2) not null default 0,
  presence_score    numeric(5,2) not null default 0,
  rank_score        numeric(5,2) not null default 0,
  rank_country      integer,
  rank_arab_world   integer,
  rank_genre        integer,
  primary_genre     text,
  calculated_date   date not null,
  created_at        timestamptz not null default now(),
  unique (creator_id, calculated_date)
);

create index if not exists analytics_cds_date_score_idx
  on analytics.creator_daily_scores(calculated_date desc, saha_score desc);

create index if not exists analytics_cds_creator_date_idx
  on analytics.creator_daily_scores(creator_id, calculated_date desc);

alter table analytics.creator_daily_scores enable row level security;

create policy if not exists "analytics_daily_scores_read" on analytics.creator_daily_scores
  for select using (
    exists (
      select 1 from analytics.creators c
      where c.id = creator_id and c.approval_status = 'approved'
    ) or public.analytics_is_admin()
  );

create policy if not exists "analytics_daily_scores_write" on analytics.creator_daily_scores
  for all using (public.analytics_is_admin());

-- ────────────────────────────────────────────────────────────
-- 4. creator_rank_snapshots
--    One row per creator per day — captures rank + totals so
--    the dashboard can compute 7-day rank movement.
-- ────────────────────────────────────────────────────────────
create table if not exists analytics.creator_rank_snapshots (
  id              bigserial primary key,
  creator_id      uuid not null references analytics.creators(id) on delete cascade,
  country         char(2),
  primary_genre   text,
  rank_country    integer,
  rank_arab_world integer,
  rank_genre      integer,
  total_followers bigint not null default 0,
  saha_score      numeric(5,2) not null default 0,
  snapshot_date   date not null,
  created_at      timestamptz not null default now(),
  unique (creator_id, snapshot_date)
);

create index if not exists analytics_crs_date_idx
  on analytics.creator_rank_snapshots(snapshot_date desc);

create index if not exists analytics_crs_creator_date_idx
  on analytics.creator_rank_snapshots(creator_id, snapshot_date desc);

alter table analytics.creator_rank_snapshots enable row level security;

create policy if not exists "analytics_rank_snapshots_read" on analytics.creator_rank_snapshots
  for select using (
    exists (
      select 1 from analytics.creators c
      where c.id = creator_id and c.approval_status = 'approved'
    ) or public.analytics_is_admin()
  );

create policy if not exists "analytics_rank_snapshots_write" on analytics.creator_rank_snapshots
  for all using (public.analytics_is_admin());
