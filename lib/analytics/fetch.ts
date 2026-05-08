/**
 * SAHA Analytics — Data Fetch Layer
 *
 * All functions accept a Supabase client and return typed data.
 * Used by both cron routes (admin client) and the dashboard
 * Server Component (SSR client with RLS).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────
// INTERNAL ROW TYPES  (DB shape → typed)
// ─────────────────────────────────────────────────────────────────

export interface CreatorRow {
  id: string;
  handle: string;
  country_code: string;
  genres: string[];
  is_live: boolean;
  is_verified: boolean;
}

export interface PlatformRow {
  creator_id: string;
  platform: string;
  followers: number;
  is_live: boolean;
  last_synced_at: string | null;
}

export interface GrowthRow {
  creator_id: string;
  period: string;
  followers_start: number;
  followers_end: number;
}

export interface DailyScoreRow {
  creator_id: string;
  saha_score: number;
  growth_score: number;
  momentum_score: number;
  consistency_score: number;
  presence_score: number;
  rank_score: number;
  rank_country: number | null;
  rank_arab_world: number | null;
  rank_genre: number | null;
  primary_genre: string | null;
  calculated_date: string;
}

export interface RankSnapshotRow {
  creator_id: string;
  country: string | null;
  rank_country: number | null;
  rank_arab_world: number | null;
  rank_genre: number | null;
  total_followers: number;
  saha_score: number;
  snapshot_date: string;
}

export interface SnapshotTotals {
  now: number;
  d7: number | null;
  d14: number | null;
  d30: number | null;
}

export interface AnalyticsDashboardData {
  /** Latest daily score row — null if < 1 day of history */
  dailyScore: DailyScoreRow | null;
  /** Rank snapshot from 7 days ago — null if < 7 days of history */
  prevWeekSnapshot: RankSnapshotRow | null;
  /** Follower totals at now / 7d / 30d */
  totals: SnapshotTotals;
  /** 30-day chart data grouped by date (latest first) */
  chart: Array<{ date: string; platform: string; followers: number }>;
  /** How many approved creators exist in same country */
  totalCountry: number;
  /** How many approved creators exist overall */
  totalGlobal: number;
  /** Score of creator ranked one above (for gap calculation) — null if #1 or no data */
  scoreAbove: number | null;
  /** Top-5 leaderboard for today */
  leaderboard: Array<{
    rank: number;
    creator_id: string;
    handle: string;
    name_ar: string;
    name_en: string;
    saha_score: number;
    score_delta: number;
    total_followers: number;
    country_code: string;
    is_you: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// CRON HELPERS — used by compute-scores
// ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/** Fetch all approved creators for scoring. */
export async function fetchApprovedCreators(
  supabase: AnyClient
): Promise<CreatorRow[]> {
  const { data, error } = await supabase
    .from("creators")
    .select("id, handle, country_code, genres, is_live, is_verified")
    .eq("approval_status", "approved");
  if (error) throw new Error(`fetchApprovedCreators: ${error.message}`);
  return (data ?? []) as CreatorRow[];
}

/** Fetch all platforms grouped as a Map<creatorId, PlatformRow[]>. */
export async function fetchAllPlatforms(
  supabase: AnyClient
): Promise<Map<string, PlatformRow[]>> {
  const { data, error } = await supabase
    .from("creator_platforms")
    .select("creator_id, platform, followers, is_live, last_synced_at");
  if (error) throw new Error(`fetchAllPlatforms: ${error.message}`);
  const map = new Map<string, PlatformRow[]>();
  for (const row of (data ?? []) as PlatformRow[]) {
    const arr = map.get(row.creator_id) ?? [];
    arr.push(row);
    map.set(row.creator_id, arr);
  }
  return map;
}

/** Fetch 30-day growth rows as a Map<creatorId, GrowthRow>. */
export async function fetchGrowth30d(
  supabase: AnyClient
): Promise<Map<string, GrowthRow>> {
  const { data, error } = await supabase
    .from("creator_growth")
    .select("creator_id, period, followers_start, followers_end")
    .eq("period", "30d");
  if (error) throw new Error(`fetchGrowth30d: ${error.message}`);
  const map = new Map<string, GrowthRow>();
  for (const row of (data ?? []) as GrowthRow[]) {
    map.set(row.creator_id, row);
  }
  return map;
}

/** Fetch 7d growth rows (for momentum). */
export async function fetchGrowth7d(
  supabase: AnyClient
): Promise<Map<string, GrowthRow>> {
  const { data, error } = await supabase
    .from("creator_growth")
    .select("creator_id, period, followers_start, followers_end")
    .eq("period", "7d");
  if (error) throw new Error(`fetchGrowth7d: ${error.message}`);
  const map = new Map<string, GrowthRow>();
  for (const row of (data ?? []) as GrowthRow[]) {
    map.set(row.creator_id, row);
  }
  return map;
}

/**
 * Fetch snapshot totals at a target date window for all creators.
 * Returns Map<creatorId, totalFollowers> using the snapshot nearest
 * to targetDate within ± toleranceDays.
 */
export async function fetchSnapshotTotalsAt(
  supabase: AnyClient,
  targetDate: Date,
  toleranceDays = 2
): Promise<Map<string, number>> {
  const from = new Date(targetDate);
  from.setDate(from.getDate() - toleranceDays);
  const to = new Date(targetDate);
  to.setDate(to.getDate() + toleranceDays);

  const { data, error } = await supabase
    .from("creator_snapshots")
    .select("creator_id, platform, followers, snapshot_date")
    .gte("snapshot_date", from.toISOString().slice(0, 10))
    .lte("snapshot_date", to.toISOString().slice(0, 10))
    .order("snapshot_date", { ascending: false });

  if (error) throw new Error(`fetchSnapshotTotalsAt: ${error.message}`);

  // For each creator, pick the latest per-platform snapshot in the window
  const perCreatorPlatform = new Map<string, Map<string, number>>();
  for (const row of (data ?? []) as {
    creator_id: string;
    platform: string;
    followers: number;
  }[]) {
    const platMap =
      perCreatorPlatform.get(row.creator_id) ?? new Map<string, number>();
    if (!platMap.has(row.platform)) {
      platMap.set(row.platform, Number(row.followers ?? 0));
    }
    perCreatorPlatform.set(row.creator_id, platMap);
  }

  const totals = new Map<string, number>();
  for (const [cid, platMap] of perCreatorPlatform.entries()) {
    let sum = 0;
    for (const v of platMap.values()) sum += v;
    totals.set(cid, sum);
  }
  return totals;
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD FETCH — used by the analytics Server Component
// ─────────────────────────────────────────────────────────────────

export async function fetchAnalyticsForCreator(
  supabase: AnyClient,
  creatorId: string,
  countryCode: string
): Promise<AnalyticsDashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const d14 = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const [
    dailyScoreRes,
    prevSnapshotRes,
    platformsRes,
    chartRes,
    totalCountryRes,
    totalGlobalRes,
    leaderboardRes,
  ] = await Promise.all([
    // Latest daily score
    supabase
      .from("creator_daily_scores")
      .select(
        "creator_id, saha_score, growth_score, momentum_score, consistency_score, presence_score, rank_score, rank_country, rank_arab_world, rank_genre, primary_genre, calculated_date"
      )
      .eq("creator_id", creatorId)
      .lte("calculated_date", today)
      .order("calculated_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Rank snapshot 7 days ago
    supabase
      .from("creator_rank_snapshots")
      .select(
        "creator_id, country, rank_country, rank_arab_world, rank_genre, total_followers, saha_score, snapshot_date"
      )
      .eq("creator_id", creatorId)
      .gte("snapshot_date", d7)
      .lte("snapshot_date", today)
      .order("snapshot_date", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Current platform followers
    supabase
      .from("creator_platforms")
      .select("platform, followers")
      .eq("creator_id", creatorId),

    // 30-day chart data
    supabase
      .from("creator_snapshots")
      .select("platform, followers, snapshot_date")
      .eq("creator_id", creatorId)
      .gte("snapshot_date", d30)
      .lte("snapshot_date", today)
      .order("snapshot_date", { ascending: true }),

    // Count of creators in same country
    supabase
      .from("creators")
      .select("id", { count: "exact", head: true })
      .eq("country_code", countryCode)
      .eq("approval_status", "approved"),

    // Count of all creators
    supabase
      .from("creators")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "approved"),

    // Top 5 leaderboard (today's scores)
    supabase
      .from("creator_daily_scores")
      .select(
        "creator_id, saha_score, rank_country, calculated_date, creators!inner(handle, name_ar, name_en, country_code)"
      )
      .eq("calculated_date", today)
      .order("saha_score", { ascending: false })
      .limit(5),
  ]);

  // ── Snapshot totals at 7d and 14d ──────────────────────────────
  const [snap7dRes, snap14dRes] = await Promise.all([
    supabase
      .from("creator_snapshots")
      .select("platform, followers")
      .eq("creator_id", creatorId)
      .gte("snapshot_date", new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10))
      .lte("snapshot_date", new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10))
      .order("snapshot_date", { ascending: false }),
    supabase
      .from("creator_snapshots")
      .select("platform, followers")
      .eq("creator_id", creatorId)
      .gte("snapshot_date", new Date(Date.now() - 16 * 86400000).toISOString().slice(0, 10))
      .lte("snapshot_date", new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10))
      .order("snapshot_date", { ascending: false }),
  ]);

  // Sum current followers
  const currentPlatforms = (platformsRes.data ?? []) as {
    platform: string;
    followers: number;
  }[];
  const nowTotal = currentPlatforms.reduce(
    (s, p) => s + Number(p.followers ?? 0),
    0
  );

  // Sum snapshot totals (latest per platform in window)
  function sumLatestPerPlatform(
    rows: Array<{ platform: string; followers: number }>
  ): number | null {
    if (!rows.length) return null;
    const seen = new Map<string, number>();
    for (const r of rows) {
      if (!seen.has(r.platform)) seen.set(r.platform, Number(r.followers ?? 0));
    }
    return Array.from(seen.values()).reduce((a, b) => a + b, 0);
  }

  const d7Total = sumLatestPerPlatform(
    (snap7dRes.data ?? []) as Array<{ platform: string; followers: number }>
  );
  const d14Total = sumLatestPerPlatform(
    (snap14dRes.data ?? []) as Array<{ platform: string; followers: number }>
  );

  // 30d total from chart data (earliest available)
  const chartRows = (chartRes.data ?? []) as Array<{
    platform: string;
    followers: number;
    snapshot_date: string;
  }>;
  const earliestByPlatform = new Map<string, number>();
  for (const r of chartRows) {
    if (!earliestByPlatform.has(r.platform)) {
      earliestByPlatform.set(r.platform, Number(r.followers ?? 0));
    }
  }
  const d30Total =
    earliestByPlatform.size > 0
      ? Array.from(earliestByPlatform.values()).reduce((a, b) => a + b, 0)
      : null;

  // Score above (for closing gap) — find creator just above in country rank
  const myRank = (dailyScoreRes.data as DailyScoreRow | null)?.rank_country;
  let scoreAbove: number | null = null;
  if (myRank && myRank > 1) {
    const { data: above } = await supabase
      .from("creator_daily_scores")
      .select("saha_score")
      .eq("calculated_date", today)
      .eq("rank_country", myRank - 1)
      .limit(1)
      .maybeSingle();
    scoreAbove = above ? Number((above as { saha_score: number }).saha_score) : null;
  }

  // Build leaderboard
  type LeaderboardCreator = { handle: string; name_ar: string; name_en: string; country_code: string };
  type LeaderboardRaw = {
    creator_id: string;
    saha_score: number;
    creators: LeaderboardCreator | LeaderboardCreator[];
  };
  const leaderboard = (leaderboardRes.data ?? [])
    .map((row, idx) => {
      const r = row as unknown as LeaderboardRaw;
      const c: LeaderboardCreator = Array.isArray(r.creators) ? r.creators[0] : r.creators;
      return {
        rank: idx + 1,
        creator_id: r.creator_id,
        handle: c.handle,
        name_ar: c.name_ar,
        name_en: c.name_en,
        saha_score: Number(r.saha_score),
        score_delta: 0,
        total_followers: 0,
        country_code: c.country_code,
        is_you: r.creator_id === creatorId,
      };
    });

  return {
    dailyScore: (dailyScoreRes.data as DailyScoreRow | null) ?? null,
    prevWeekSnapshot: (prevSnapshotRes.data as RankSnapshotRow | null) ?? null,
    totals: { now: nowTotal, d7: d7Total, d14: d14Total, d30: d30Total },
    chart: chartRows.map((r) => ({
      date: r.snapshot_date,
      platform: r.platform,
      followers: Number(r.followers),
    })),
    totalCountry: totalCountryRes.count ?? 0,
    totalGlobal: totalGlobalRes.count ?? 0,
    scoreAbove,
    leaderboard,
  };
}
