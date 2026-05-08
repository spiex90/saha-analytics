-- ============================================================
-- SAHA Analytics — Initial Schema
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- ENUMS
-- ============================================================

create type approval_status as enum ('pending', 'approved', 'rejected');
create type user_role as enum ('creator', 'brand', 'admin');
create type platform_id as enum ('twitch', 'youtube', 'tiktok', 'instagram', 'kick');
create type ranking_scope as enum ('kuwait', 'gcc');

-- ============================================================
-- USERS (mirrors auth.users, extended with role)
-- ============================================================

create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        user_role not null default 'creator',
  creator_id  uuid,           -- set after creator profile is linked
  created_at  timestamptz not null default now()
);

-- Auto-create user row on signup via trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'creator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- CREATORS
-- ============================================================

create table creators (
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
  approval_status  approval_status not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index creators_handle_idx on creators(handle);
create index creators_country_idx on creators(country_code);
create index creators_status_idx on creators(approval_status);
create index creators_name_en_trgm on creators using gin(name_en gin_trgm_ops);
create index creators_name_ar_trgm on creators using gin(name_ar gin_trgm_ops);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger creators_updated_at
  before update on creators
  for each row execute procedure set_updated_at();

-- ============================================================
-- CREATOR PLATFORMS
-- ============================================================

create table creator_platforms (
  id                  uuid primary key default uuid_generate_v4(),
  creator_id          uuid not null references creators(id) on delete cascade,
  platform            platform_id not null,
  platform_user_id    text not null,
  platform_username   text not null,
  followers           bigint not null default 0,
  is_live             boolean not null default false,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  unique (creator_id, platform)
);

create index creator_platforms_creator_idx on creator_platforms(creator_id);
create index creator_platforms_platform_idx on creator_platforms(platform);

-- ============================================================
-- CREATOR SNAPSHOTS
-- ============================================================

create table creator_snapshots (
  id          uuid primary key default uuid_generate_v4(),
  creator_id  uuid not null references creators(id) on delete cascade,
  platform    platform_id not null,
  followers   bigint not null,
  taken_at    timestamptz not null default now()
);

create index creator_snapshots_creator_idx on creator_snapshots(creator_id);
create index creator_snapshots_taken_at_idx on creator_snapshots(taken_at desc);
create index creator_snapshots_creator_platform_idx on creator_snapshots(creator_id, platform, taken_at desc);

-- ============================================================
-- CREATOR SCORES
-- ============================================================

create table creator_scores (
  id               uuid primary key default uuid_generate_v4(),
  creator_id       uuid not null unique references creators(id) on delete cascade,
  audience_score   numeric(5,2) not null default 0,
  growth_score     numeric(5,2) not null default 0,
  activity_score   numeric(5,2) not null default 0,
  diversity_score  numeric(5,2) not null default 0,
  final_score      numeric(5,2) not null default 0,
  computed_at      timestamptz not null default now()
);

create index creator_scores_final_idx on creator_scores(final_score desc);

-- ============================================================
-- RANKINGS
-- ============================================================

create table rankings (
  id           uuid primary key default uuid_generate_v4(),
  creator_id   uuid not null references creators(id) on delete cascade,
  scope        ranking_scope not null,
  country_code char(2),
  rank         integer not null,
  score        numeric(5,2) not null default 0,
  computed_at  timestamptz not null default now()
);

create index rankings_scope_rank_idx on rankings(scope, rank);
create index rankings_creator_idx on rankings(creator_id);

-- ============================================================
-- SPOTLIGHT CREATORS
-- ============================================================

create table spotlight_creators (
  id          uuid primary key default uuid_generate_v4(),
  creator_id  uuid not null references creators(id) on delete cascade,
  position    integer not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (position)
);

-- ============================================================
-- SAVED LISTS (brand feature)
-- ============================================================

create table saved_lists (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index saved_lists_user_idx on saved_lists(user_id);

create table saved_list_items (
  id          uuid primary key default uuid_generate_v4(),
  list_id     uuid not null references saved_lists(id) on delete cascade,
  creator_id  uuid not null references creators(id) on delete cascade,
  added_at    timestamptz not null default now(),
  unique (list_id, creator_id)
);

-- ============================================================
-- REPORTS
-- ============================================================

create table reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid references users(id) on delete set null,
  creator_id   uuid not null references creators(id) on delete cascade,
  reason       text not null,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table creators enable row level security;
alter table creator_platforms enable row level security;
alter table creator_snapshots enable row level security;
alter table creator_scores enable row level security;
alter table rankings enable row level security;
alter table spotlight_creators enable row level security;
alter table saved_lists enable row level security;
alter table saved_list_items enable row level security;
alter table reports enable row level security;

-- USERS: users can read/update their own row
create policy "users_select_own" on users
  for select using (auth.uid() = id);

create policy "users_update_own" on users
  for update using (auth.uid() = id);

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

-- CREATORS: public read for approved, full access for admins
create policy "creators_public_read" on creators
  for select using (approval_status = 'approved' or is_admin());

create policy "creators_admin_write" on creators
  for all using (is_admin());

-- CREATOR PLATFORMS: public read
create policy "creator_platforms_public_read" on creator_platforms
  for select using (
    exists (
      select 1 from creators c
      where c.id = creator_id and c.approval_status = 'approved'
    )
    or is_admin()
  );

create policy "creator_platforms_admin_write" on creator_platforms
  for all using (is_admin());

-- CREATOR SNAPSHOTS: public read for approved creators
create policy "creator_snapshots_public_read" on creator_snapshots
  for select using (
    exists (
      select 1 from creators c
      where c.id = creator_id and c.approval_status = 'approved'
    )
    or is_admin()
  );

create policy "creator_snapshots_admin_write" on creator_snapshots
  for all using (is_admin());

-- CREATOR SCORES: public read
create policy "creator_scores_public_read" on creator_scores
  for select using (
    exists (
      select 1 from creators c
      where c.id = creator_id and c.approval_status = 'approved'
    )
    or is_admin()
  );

-- RANKINGS: public read
create policy "rankings_public_read" on rankings
  for select using (true);

create policy "rankings_admin_write" on rankings
  for all using (is_admin());

-- SPOTLIGHT: public read
create policy "spotlight_public_read" on spotlight_creators
  for select using (active = true or is_admin());

create policy "spotlight_admin_write" on spotlight_creators
  for all using (is_admin());

-- SAVED LISTS: owner-only
create policy "saved_lists_owner_read" on saved_lists
  for select using (user_id = auth.uid());

create policy "saved_lists_owner_write" on saved_lists
  for all using (user_id = auth.uid());

create policy "saved_list_items_owner" on saved_list_items
  for all using (
    exists (
      select 1 from saved_lists l
      where l.id = list_id and l.user_id = auth.uid()
    )
  );

-- REPORTS: authenticated users can insert
create policy "reports_insert" on reports
  for insert with check (auth.uid() is not null);

create policy "reports_admin_read" on reports
  for select using (is_admin());
