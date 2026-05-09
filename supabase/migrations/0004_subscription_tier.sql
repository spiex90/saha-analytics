-- ============================================================
-- SAHA Analytics — Subscription Tier
-- Migration 0004
-- ============================================================
-- Adds a subscription_tier column to analytics.users so the
-- dashboard can gate Pro-only features per user.
-- ============================================================

-- ── 1. Enum ──────────────────────────────────────────────────
create type analytics.subscription_tier as enum ('free', 'pro');

-- ── 2. Column ────────────────────────────────────────────────
alter table analytics.users
  add column if not exists subscription_tier analytics.subscription_tier not null default 'free';

comment on column analytics.users.subscription_tier
  is 'User subscription level. free = standard access, pro = unlocked analytics features.';

-- ── 3. Seed: spiex is Pro ────────────────────────────────────
update analytics.users
  set subscription_tier = 'pro'
  where creator_id = (
    select id from analytics.creators where handle = 'spiex'
  );
