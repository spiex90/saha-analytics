-- ============================================================
-- SAHA Analytics — Calibration Period Fields
-- Migration 0003
-- ============================================================
-- Tracks when a creator was first indexed so we can show a
-- proper "Calibration Period" UI instead of empty/broken
-- analytics during the first 7 days of history collection.
-- ============================================================

-- ── 1. Add calibration fields to creators ──────────────────

alter table analytics.creators
  add column if not exists indexed_at             timestamptz,
  add column if not exists calibration_ends_at    timestamptz,
  add column if not exists calibration_completed_at timestamptz;

comment on column analytics.creators.indexed_at
  is 'When this creator was first ingested into SAHA. Used as the calibration start anchor.';

comment on column analytics.creators.calibration_ends_at
  is 'When the calibration period ends (indexed_at + 7 days by default). Null = use indexed_at + 7d.';

comment on column analytics.creators.calibration_completed_at
  is 'Set when we confirm growth history exists — marks calibration as finished early if data arrives sooner than 7 days.';

-- ── 2. Back-fill indexed_at for existing creators ──────────
-- Use created_at as the proxy for existing creators.

update analytics.creators
  set indexed_at = created_at
  where indexed_at is null;

-- ── 3. Trigger: auto-set indexed_at on insert ──────────────

create or replace function analytics.set_indexed_at()
returns trigger language plpgsql as $$
begin
  if new.indexed_at is null then
    new.indexed_at := now();
  end if;
  if new.calibration_ends_at is null and new.indexed_at is not null then
    new.calibration_ends_at := new.indexed_at + interval '7 days';
  end if;
  return new;
end;
$$;

drop trigger if exists analytics_creators_set_indexed_at on analytics.creators;

create trigger analytics_creators_set_indexed_at
  before insert on analytics.creators
  for each row execute function analytics.set_indexed_at();

-- ── 4. Back-fill calibration_ends_at for existing rows ─────

update analytics.creators
  set calibration_ends_at = indexed_at + interval '7 days'
  where calibration_ends_at is null and indexed_at is not null;
