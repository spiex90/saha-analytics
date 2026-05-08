-- ============================================================
-- SAHA Analytics — Initial Schema
-- ALL tables live in the "analytics" schema.
-- The "public" schema (saha.gg) is completely untouched.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- SCHEMA
-- ============================================================

create schema if not exists analytics;

-- ============================================================
-- ENUMS (scoped to analytics schema)
-- ============================================================

create type analytics.approval_status as enum ('pending', 'approved', 'rejected');
create type analytics.user_role       as enum ('creator', 'brand', 'admin');
create type analytics.platform_id     as enum ('twitch', 'youtube', 'tiktok', 'instagram', 'kick');
create type analytics.ranking_scope   as enum ('kuwait', 'gcc');

-- ============================================================
-- USERS
-- ============================================================

create table analytics.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        analytics.user_role not null default 'creator',
  creator_id  uuid,
  created_at  timestamptz not null default now()
);

-- Auto-create analytics.users row on signup
create or replace function public.analytics_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into analytics.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce((new.raw_user_meta_data->>'role')::analytics.user_role, 'creator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger analytics_on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.analytics_handle_new_user();

-- ============================================================
-- CREATORS
-- ============================================================

create table analytics.creators (
  id               uuid primary key default uuid_generate_v4(),
  handle           text not null unique,
  name_en          text not null,
  name_ar          text not null default '',
  bio_en           text,
  bio_ar           text,
  avatar_url       text,
  country_code     char(2) not null,
  genres           text[] not null default '{}',
  is_verified      boolean not null default false,
  is_featured      boolean not null default false,
  is_live          boolean not null default false,
  approval_status  analytics.approval_status not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index analytics_creators_handle_idx   on analytics.creators(handle);
create index analytics_creators_country_idx  on analytics.creators(country_code);
create index analytics_creators_status_idx   on analytics.creators(approval_status);
create index analytics_creators_name_en_trgm on analytics.creators using gin(name_en gin_trgm_ops);
create index analytics_creators_name_ar_trgm on analytics.creators using gin(name_ar gin_trgm_ops);

create or replace function public.analytics_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger analytics_creators_updated_at
  before update on analytics.creators
  for each row execute procedure public.analytics_set_updated_at();

-- ============================================================
-- CREATOR PLATFORMS
-- ============================================================

create table analytics.creator_platforms (
  id                  uuid primary key default uuid_generate_v4(),
  creator_id          uuid not null references analytics.creators(id) on delete cascade,
  platform            analytics.platform_id not null,
  platform_user_id    text not null default '',
  platform_username   text not null,
  followers           bigint not null default 0,
  is_live             boolean not null default false,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  unique (creator_id, platform)
);

create index analytics_creator_platforms_creator_idx  on analytics.creator_platforms(creator_id);
create index analytics_creator_platforms_platform_idx on analytics.creator_platforms(platform);

-- ============================================================
-- CREATOR SNAPSHOTS (append-only, one row per creator/platform/day)
-- ============================================================

create table analytics.creator_snapshots (
  id          bigserial primary key,
  creator_id  uuid not null references analytics.creators(id) on delete cascade,
  platform    analytics.platform_id not null,
  followers   bigint not null,
  taken_at    timestamptz not null default now(),
  unique (creator_id, platform, taken_at::date)
);

create index analytics_creator_snapshots_creator_idx          on analytics.creator_snapshots(creator_id);
create index analytics_creator_snapshots_taken_at_idx         on analytics.creator_snapshots(taken_at desc);
create index analytics_creator_snapshots_creator_platform_idx on analytics.creator_snapshots(creator_id, platform, taken_at desc);

-- ============================================================
-- CREATOR SCORES
-- ============================================================

create table analytics.creator_scores (
  creator_id       uuid primary key references analytics.creators(id) on delete cascade,
  audience_score   numeric(5,2) not null default 0,
  growth_score     numeric(5,2) not null default 0,
  activity_score   numeric(5,2) not null default 0,
  diversity_score  numeric(5,2) not null default 0,
  final_score      numeric(5,2) not null default 0,
  computed_at      timestamptz not null default now()
);

create index analytics_creator_scores_final_idx on analytics.creator_scores(final_score desc);

-- ============================================================
-- RANKINGS
-- ============================================================

create table analytics.rankings (
  id           bigserial primary key,
  creator_id   uuid not null references analytics.creators(id) on delete cascade,
  scope        analytics.ranking_scope not null,
  rank         integer not null,
  score        numeric(5,2) not null default 0,
  computed_at  timestamptz not null default now()
);

create index analytics_rankings_scope_rank_idx on analytics.rankings(scope, rank);
create index analytics_rankings_creator_idx    on analytics.rankings(creator_id);

-- ============================================================
-- SPOTLIGHT CREATORS
-- ============================================================

create table analytics.spotlight_creators (
  id          uuid primary key default uuid_generate_v4(),
  creator_id  uuid not null references analytics.creators(id) on delete cascade,
  position    integer not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SAVED LISTS (brand feature)
-- ============================================================

create table analytics.saved_lists (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references analytics.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index analytics_saved_lists_user_idx on analytics.saved_lists(user_id);

create table analytics.saved_list_items (
  list_id     uuid not null references analytics.saved_lists(id) on delete cascade,
  creator_id  uuid not null references analytics.creators(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (list_id, creator_id)
);

-- ============================================================
-- REPORTS
-- ============================================================

create table analytics.reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid references analytics.users(id) on delete set null,
  creator_id   uuid not null references analytics.creators(id) on delete cascade,
  reason       text not null,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table analytics.users              enable row level security;
alter table analytics.creators           enable row level security;
alter table analytics.creator_platforms  enable row level security;
alter table analytics.creator_snapshots  enable row level security;
alter table analytics.creator_scores     enable row level security;
alter table analytics.rankings           enable row level security;
alter table analytics.spotlight_creators enable row level security;
alter table analytics.saved_lists        enable row level security;
alter table analytics.saved_list_items   enable row level security;
alter table analytics.reports            enable row level security;

-- Admin helper (reads from analytics.users)
create or replace function public.analytics_is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from analytics.users where id = auth.uid() and role = 'admin'
  );
$$;

-- USERS
create policy "analytics_users_select_own" on analytics.users
  for select using (auth.uid() = id or public.analytics_is_admin());

create policy "analytics_users_update_own" on analytics.users
  for update using (auth.uid() = id);

-- CREATORS: public read for approved
create policy "analytics_creators_public_read" on analytics.creators
  for select using (approval_status = 'approved' or public.analytics_is_admin());

create policy "analytics_creators_admin_write" on analytics.creators
  for all using (public.analytics_is_admin());

-- CREATOR PLATFORMS: public read for approved creators
create policy "analytics_creator_platforms_read" on analytics.creator_platforms
  for select using (
    exists (select 1 from analytics.creators c where c.id = creator_id and c.approval_status = 'approved')
    or public.analytics_is_admin()
  );

create policy "analytics_creator_platforms_write" on analytics.creator_platforms
  for all using (public.analytics_is_admin());

-- CREATOR SNAPSHOTS
create policy "analytics_snapshots_read" on analytics.creator_snapshots
  for select using (
    exists (select 1 from analytics.creators c where c.id = creator_id and c.approval_status = 'approved')
    or public.analytics_is_admin()
  );

-- CREATOR SCORES
create policy "analytics_scores_read" on analytics.creator_scores
  for select using (
    exists (select 1 from analytics.creators c where c.id = creator_id and c.approval_status = 'approved')
    or public.analytics_is_admin()
  );

-- RANKINGS
create policy "analytics_rankings_read" on analytics.rankings
  for select using (true);

create policy "analytics_rankings_write" on analytics.rankings
  for all using (public.analytics_is_admin());

-- SPOTLIGHT
create policy "analytics_spotlight_read" on analytics.spotlight_creators
  for select using (active = true or public.analytics_is_admin());

create policy "analytics_spotlight_write" on analytics.spotlight_creators
  for all using (public.analytics_is_admin());

-- SAVED LISTS
create policy "analytics_saved_lists_owner" on analytics.saved_lists
  for all using (user_id = auth.uid());

create policy "analytics_saved_list_items_owner" on analytics.saved_list_items
  for all using (
    exists (select 1 from analytics.saved_lists l where l.id = list_id and l.user_id = auth.uid())
  );

-- REPORTS
create policy "analytics_reports_insert" on analytics.reports
  for insert with check (auth.uid() is not null);

create policy "analytics_reports_admin_read" on analytics.reports
  for select using (public.analytics_is_admin());
