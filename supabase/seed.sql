-- ============================================================
-- SAHA Analytics — Seed Data
-- Spiex as first creator with 30 days of fake snapshots
-- ============================================================

-- Insert Spiex creator
insert into creators (
  id,
  handle,
  name_en,
  name_ar,
  bio_en,
  bio_ar,
  avatar_url,
  country_code,
  genres,
  is_verified,
  is_featured,
  is_live,
  approval_status
) values (
  '00000000-0000-0000-0000-000000000001',
  'spiex',
  'Spiex',
  'سبيكس',
  'Kuwaiti gaming creator & Twitch streamer. Founder of SAHA.',
  'مبدع كويتي في مجال الألعاب ومؤسس سَاحة.',
  null,
  'KW',
  array['Gaming', 'FPS', 'Strategy'],
  true,
  true,
  false,
  'approved'
) on conflict (handle) do nothing;

-- Insert platform entries for Spiex
insert into creator_platforms (creator_id, platform, platform_user_id, platform_username, followers, last_synced_at)
values
  ('00000000-0000-0000-0000-000000000001', 'twitch',    'spiex_twitch_id',    'spiex',       42000,  now()),
  ('00000000-0000-0000-0000-000000000001', 'youtube',   'spiex_youtube_id',   'spiex',       89000,  now()),
  ('00000000-0000-0000-0000-000000000001', 'tiktok',    'spiex_tiktok_id',    'spiex',      210000,  now()),
  ('00000000-0000-0000-0000-000000000001', 'instagram', 'spiex_instagram_id', 'spiex',       55000,  now()),
  ('00000000-0000-0000-0000-000000000001', 'kick',      'spiex_kick_id',      'spiex',        8000,  now())
on conflict (creator_id, platform) do update set
  followers = excluded.followers,
  last_synced_at = excluded.last_synced_at;

-- Insert 30 days of fake snapshots for each platform
-- We generate a series with slight daily growth (+0.3% per day)
do $$
declare
  base_day   date := current_date - interval '29 days';
  i          integer;
  snap_date  timestamptz;
  base_twitch    bigint := 40000;
  base_youtube   bigint := 85000;
  base_tiktok    bigint := 200000;
  base_insta     bigint := 52000;
  base_kick      bigint := 7500;
  growth_factor  numeric := 1.003; -- 0.3% daily growth
begin
  for i in 0..29 loop
    snap_date := (base_day + (i * interval '1 day'))::timestamptz + interval '12 hours';

    insert into creator_snapshots (creator_id, platform, followers, taken_at) values
      ('00000000-0000-0000-0000-000000000001', 'twitch',    (base_twitch    * power(growth_factor, i))::bigint, snap_date),
      ('00000000-0000-0000-0000-000000000001', 'youtube',   (base_youtube   * power(growth_factor, i))::bigint, snap_date),
      ('00000000-0000-0000-0000-000000000001', 'tiktok',    (base_tiktok    * power(growth_factor, i))::bigint, snap_date),
      ('00000000-0000-0000-0000-000000000001', 'instagram', (base_insta     * power(growth_factor, i))::bigint, snap_date),
      ('00000000-0000-0000-0000-000000000001', 'kick',      (base_kick      * power(growth_factor, i))::bigint, snap_date);
  end loop;
end;
$$;

-- Compute and insert initial SAHA score for Spiex
-- Total followers: ~404,000 → audience_score ≈ 74
-- Monthly growth: 9% → growth_score ≈ 45
-- Snapshots: 150 (5 platforms × 30 days) → activity_score = 100
-- Platforms: 5 → diversity_score = 100
-- Final: 0.4*74 + 0.3*45 + 0.2*100 + 0.1*100 = 29.6 + 13.5 + 20 + 10 = 73.1
insert into creator_scores (creator_id, audience_score, growth_score, activity_score, diversity_score, final_score, computed_at)
values (
  '00000000-0000-0000-0000-000000000001',
  74.0,
  45.0,
  100.0,
  100.0,
  73.1,
  now()
) on conflict (creator_id) do update set
  audience_score  = excluded.audience_score,
  growth_score    = excluded.growth_score,
  activity_score  = excluded.activity_score,
  diversity_score = excluded.diversity_score,
  final_score     = excluded.final_score,
  computed_at     = excluded.computed_at;

-- Insert Kuwait #1 and GCC #1 ranking for Spiex
insert into rankings (creator_id, scope, country_code, rank, score, computed_at)
values
  ('00000000-0000-0000-0000-000000000001', 'kuwait', 'KW', 1, 73.1, now()),
  ('00000000-0000-0000-0000-000000000001', 'gcc',    'KW', 1, 73.1, now())
on conflict do nothing;

-- Add Spiex to spotlight
insert into spotlight_creators (creator_id, position, active)
values ('00000000-0000-0000-0000-000000000001', 1, true)
on conflict (position) do update set creator_id = excluded.creator_id;
