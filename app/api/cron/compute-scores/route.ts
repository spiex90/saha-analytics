/**
 * SAHA Score Computation — Cron Route
 *
 * Computes SAHA v2 scores for all approved creators and writes to:
 *   - analytics.creator_daily_scores  (new, date-partitioned)
 *   - analytics.creator_scores        (legacy, kept for backward compat)
 *
 * Two-pass algorithm to avoid circular dependency between SAHA score
 * and rank_score (rank is derived from SAHA, which includes rank_score):
 *   Pass 1 — compute preliminary SAHA with rank_score = 0
 *   Pass 2 — assign ranks, compute rank_score, compute final SAHA
 *
 * Schedule: 15 3 * * *  (3:15 AM UTC — after compute-growth at 3:00)
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeGrowthScore,
  computeMomentumScore,
  computeConsistencyScore,
  computePresenceScore,
  computeRankScore,
  computeSahaScore,
  inactivityPenalty,
} from "@/lib/analytics/calculate";
import {
  fetchApprovedCreators,
  fetchAllPlatforms,
  fetchGrowth30d,
  fetchGrowth7d,
} from "@/lib/analytics/fetch";
import { computeSAHAScore } from "@/lib/score/compute"; // legacy

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];

  // ── Bulk data load ──────────────────────────────────────────────
  let creators, platformMap, growth30Map, growth7Map;
  try {
    [creators, platformMap, growth30Map, growth7Map] = await Promise.all([
      fetchApprovedCreators(supabase),
      fetchAllPlatforms(supabase),
      fetchGrowth30d(supabase),
      fetchGrowth7d(supabase),
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: `Data load failed: ${String(e)}` },
      { status: 500 }
    );
  }

  // ── Pass 1: preliminary scores (rank_score = 0) ─────────────────
  type CreatorEntry = {
    id: string;
    country_code: string;
    primary_genre: string | null;
    preliminary_saha: number;
    growth_score: number;
    momentum_score: number;
    consistency_score: number;
    presence_score: number;
    total_followers: number;
    penalty: number;
  };

  const entries: CreatorEntry[] = [];

  for (const creator of creators) {
    const platforms = platformMap.get(creator.id) ?? [];
    const g30 = growth30Map.get(creator.id);
    const g7 = growth7Map.get(creator.id);

    // Followers
    const totalFollowers = platforms.reduce(
      (s, p) => s + Number(p.followers ?? 0),
      0
    );
    const activePlatformCount = platforms.filter(
      (p) => Number(p.followers) > 0
    ).length;

    // Growth %
    const growth30dPct =
      g30 && g30.followers_start > 0
        ? ((g30.followers_end - g30.followers_start) / g30.followers_start) * 100
        : 0;

    // Momentum — need recent vs prior 7d rates
    const recent7dPct =
      g7 && g7.followers_start > 0
        ? ((g7.followers_end - g7.followers_start) / g7.followers_start) * 100
        : 0;

    // Prior 7d: we don't have separate 14-7d data yet — approximate as 0
    // (Will improve once creator_growth stores 14d data with offset)
    const prior7dPct = 0;

    // Activity: use is_live + last_synced_at of primary platform
    const sortedPlatforms = [...platforms].sort(
      (a, b) =>
        (b.last_synced_at ? new Date(b.last_synced_at).getTime() : 0) -
        (a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0)
    );
    const lastSyncedAt = sortedPlatforms[0]?.last_synced_at;
    const hoursSinceLastLive = lastSyncedAt
      ? (Date.now() - new Date(lastSyncedAt).getTime()) / 3600000
      : null;

    // Days inactive (for penalty)
    const daysInactive =
      hoursSinceLastLive !== null ? hoursSinceLastLive / 24 : null;

    // Score components
    const growth_score = computeGrowthScore(growth30dPct);
    const { score: momentum_score } = computeMomentumScore({
      recent7dGrowthPct: recent7dPct,
      prior7dGrowthPct: prior7dPct,
      isLiveNow: creator.is_live,
      hoursSinceLastLive,
    });
    const consistency_score = computeConsistencyScore({
      hasSchedule: false, // No schedule field yet in DB
      liveInLast7d: hoursSinceLastLive !== null && hoursSinceLastLive <= 168,
      liveInLast14d: hoursSinceLastLive !== null && hoursSinceLastLive <= 336,
      completedStreams: null,
      expectedStreams: null,
    });
    const presence_score = computePresenceScore({
      platformCount: activePlatformCount,
      primaryPlatformVerified: creator.is_verified,
    });
    const penalty = inactivityPenalty(daysInactive);

    // Preliminary SAHA (rank_score = 0)
    const preliminary_saha = computeSahaScore({
      growth: growth_score,
      momentum: momentum_score,
      rankScore: 0,
      consistency: consistency_score,
      presence: presence_score,
      penalty,
    });

    entries.push({
      id: creator.id,
      country_code: creator.country_code,
      primary_genre: creator.genres?.[0] ?? null,
      preliminary_saha,
      growth_score,
      momentum_score,
      consistency_score,
      presence_score,
      total_followers: totalFollowers,
      penalty,
    });
  }

  // ── Pass 2: assign ranks & compute final SAHA ───────────────────

  // Group by scope for ranking
  const byCountry = new Map<string, CreatorEntry[]>();
  const byGenre = new Map<string, CreatorEntry[]>();
  const allEntries = [...entries];

  for (const e of entries) {
    const arr = byCountry.get(e.country_code) ?? [];
    arr.push(e);
    byCountry.set(e.country_code, arr);

    if (e.primary_genre) {
      const ga = byGenre.get(e.primary_genre) ?? [];
      ga.push(e);
      byGenre.set(e.primary_genre, ga);
    }
  }

  // Sort by preliminary_saha desc (tie-break: total_followers)
  const sortFn = (a: CreatorEntry, b: CreatorEntry) =>
    b.preliminary_saha - a.preliminary_saha ||
    b.total_followers - a.total_followers;

  allEntries.sort(sortFn);
  for (const arr of byCountry.values()) arr.sort(sortFn);
  for (const arr of byGenre.values()) arr.sort(sortFn);

  // Build rank maps
  const arabRankMap = new Map<string, number>();
  allEntries.forEach((e, i) => arabRankMap.set(e.id, i + 1));

  const countryRankMap = new Map<string, number>();
  for (const arr of byCountry.values()) {
    arr.forEach((e, i) => countryRankMap.set(e.id, i + 1));
  }

  const genreRankMap = new Map<string, number>();
  for (const arr of byGenre.values()) {
    arr.forEach((e, i) => genreRankMap.set(e.id, i + 1));
  }

  const totalGlobal = allEntries.length;

  // Final SAHA with rank_score
  type FinalEntry = CreatorEntry & {
    rank_arab_world: number;
    rank_country: number;
    rank_genre: number | null;
    rank_score: number;
    saha_score: number;
  };

  const finalEntries: FinalEntry[] = entries.map((e) => {
    const countryCreators = byCountry.get(e.country_code)?.length ?? 0;
    const genreCreators = e.primary_genre
      ? (byGenre.get(e.primary_genre)?.length ?? 0)
      : 0;

    const rank_arab_world = arabRankMap.get(e.id) ?? totalGlobal;
    const rank_country = countryRankMap.get(e.id) ?? countryCreators;
    const rank_genre = e.primary_genre ? (genreRankMap.get(e.id) ?? null) : null;

    const rank_score = computeRankScore({
      rankCountry: rank_country,
      totalCountry: countryCreators,
      rankArab: rank_arab_world,
      totalArab: totalGlobal,
      rankGenre: rank_genre,
      totalGenre: genreCreators,
    });

    const saha_score = computeSahaScore({
      growth: e.growth_score,
      momentum: e.momentum_score,
      rankScore: rank_score,
      consistency: e.consistency_score,
      presence: e.presence_score,
      penalty: e.penalty,
    });

    return {
      ...e,
      rank_arab_world,
      rank_country,
      rank_genre,
      rank_score,
      saha_score,
    };
  });

  // ── Bulk upsert to creator_daily_scores ─────────────────────────
  const newRows = finalEntries.map((e) => ({
    creator_id: e.id,
    saha_score: e.saha_score,
    growth_score: e.growth_score,
    momentum_score: e.momentum_score,
    consistency_score: e.consistency_score,
    presence_score: e.presence_score,
    rank_score: e.rank_score,
    rank_country: e.rank_country,
    rank_arab_world: e.rank_arab_world,
    rank_genre: e.rank_genre,
    primary_genre: e.primary_genre,
    calculated_date: today,
  }));

  const CHUNK = 500;
  for (let i = 0; i < newRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("creator_daily_scores")
      .upsert(newRows.slice(i, i + CHUNK), {
        onConflict: "creator_id,calculated_date",
      });
    if (error) errors.push(`daily_scores chunk ${i}: ${error.message}`);
  }

  // ── Also write legacy creator_scores (backward compat) ──────────
  for (const e of finalEntries) {
    const platforms = platformMap.get(e.id) ?? [];
    const totalFollowers = e.total_followers;
    const activePlatformCount = platforms.filter(
      (p) => Number(p.followers) > 0
    ).length;
    const g30 = growth30Map.get(e.id);
    const monthlyGrowthRate = g30?.followers_start
      ? (g30.followers_end - g30.followers_start) / g30.followers_start
      : 0;
    const snapshotCount30Days = 0; // not critical for legacy

    const legacyScore = computeSAHAScore({
      totalFollowers,
      monthlyGrowthRate,
      snapshotCount30Days,
      activePlatformCount,
    });

    const { error } = await supabase.from("creator_scores").upsert(
      {
        creator_id: e.id,
        ...legacyScore,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "creator_id" }
    );
    if (error) errors.push(`legacy_score ${e.id}: ${error.message}`);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    computed: finalEntries.length,
    errors: errors.length,
    errorDetails: errors.slice(0, 20),
    timestamp: new Date().toISOString(),
  });
}
