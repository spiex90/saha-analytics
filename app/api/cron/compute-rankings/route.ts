import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Platform = "twitch" | "youtube" | "tiktok" | "instagram" | "kick";
const PLATFORMS: Platform[] = [
  "twitch",
  "youtube",
  "tiktok",
  "instagram",
  "kick",
];
const GCC_COUNTRIES = new Set(["KW", "SA", "AE", "QA", "BH", "OM"]);

type RankingRow = {
  scope: string;
  creator_id: string;
  rank: number;
  score: number;
  computed_at: string;
};

/**
 * Compute all ranking tables in one pass.
 *
 * Scopes generated:
 *   Score-based:    gcc | country_{CC}
 *   Growth-based:   fastest_gcc | fastest_{CC}
 *   Platform:       platform_twitch | platform_youtube | ...
 *   Genre:          genre_{name}
 *
 * Deletes all existing rankings and reinserts (atomic within ~seconds).
 * Schedule: 30 3 * * * (3:30 AM UTC — after compute-growth and compute-scores)
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const computedAt = new Date().toISOString();
  const errorDetails: Array<{ step: string; msg: string }> = [];

  // ── Load all data ─────────────────────────────────────────────────────────

  const { data: creators, error: creatorsErr } = await supabase
    .from("creators")
    .select("id, country_code, genres")
    .eq("approval_status", "approved");

  if (creatorsErr) {
    return NextResponse.json(
      { error: "Failed to load creators", details: creatorsErr.message },
      { status: 500 }
    );
  }

  const { data: scores, error: scoresErr } = await supabase
    .from("creator_scores")
    .select("creator_id, final_score");

  if (scoresErr) {
    return NextResponse.json(
      { error: "Failed to load scores", details: scoresErr.message },
      { status: 500 }
    );
  }

  const { data: growth, error: growthErr } = await supabase
    .from("creator_growth")
    .select("creator_id, followers_delta")
    .eq("period", "30d");

  if (growthErr) {
    return NextResponse.json(
      { error: "Failed to load growth", details: growthErr.message },
      { status: 500 }
    );
  }

  const { data: platforms, error: platformsErr } = await supabase
    .from("creator_platforms")
    .select("creator_id, platform, followers");

  if (platformsErr) {
    return NextResponse.json(
      { error: "Failed to load platforms", details: platformsErr.message },
      { status: 500 }
    );
  }

  // ── Build index maps ──────────────────────────────────────────────────────

  const approvedIds = new Set((creators ?? []).map((c) => c.id as string));

  const creatorMeta = new Map<
    string,
    { country_code: string | null; genres: string[] }
  >();
  for (const c of creators ?? []) {
    creatorMeta.set(c.id as string, {
      country_code: (c.country_code as string | null) ?? null,
      genres: (c.genres as string[] | null) ?? [],
    });
  }

  const scoreMap = new Map<string, number>();
  for (const s of scores ?? []) {
    if (approvedIds.has(s.creator_id as string)) {
      scoreMap.set(s.creator_id as string, Number(s.final_score ?? 0));
    }
  }

  const growthMap = new Map<string, number>();
  for (const g of growth ?? []) {
    if (approvedIds.has(g.creator_id as string)) {
      growthMap.set(g.creator_id as string, Number(g.followers_delta ?? 0));
    }
  }

  const platformFollowers = new Map<
    Platform,
    Map<string, number>
  >();
  for (const p of PLATFORMS) platformFollowers.set(p, new Map());

  for (const p of platforms ?? []) {
    if (!approvedIds.has(p.creator_id as string)) continue;
    const plat = p.platform as Platform;
    if (!PLATFORMS.includes(plat)) continue;
    platformFollowers.get(plat)!.set(p.creator_id as string, Number(p.followers ?? 0));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const rows: RankingRow[] = [];

  function buildScope(
    scope: string,
    entries: Array<{ creator_id: string; score: number }>
  ) {
    if (!entries.length) return;
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => {
      rows.push({
        scope,
        creator_id: e.creator_id,
        rank: i + 1,
        score: e.score,
        computed_at: computedAt,
      });
    });
  }

  // ── Score-based rankings ──────────────────────────────────────────────────

  const gccScore: Array<{ creator_id: string; score: number }> = [];
  const byCountryScore = new Map<
    string,
    Array<{ creator_id: string; score: number }>
  >();

  for (const [cid, score] of scoreMap.entries()) {
    const meta = creatorMeta.get(cid);
    if (!meta) continue;
    if (meta.country_code && GCC_COUNTRIES.has(meta.country_code)) {
      gccScore.push({ creator_id: cid, score });
    }
    if (meta.country_code) {
      const arr = byCountryScore.get(meta.country_code) ?? [];
      arr.push({ creator_id: cid, score });
      byCountryScore.set(meta.country_code, arr);
    }
  }

  buildScope("gcc", gccScore);
  for (const [cc, arr] of byCountryScore.entries()) {
    buildScope(`country_${cc}`, arr);
  }

  // ── Growth-based rankings (30d followers_delta) ───────────────────────────

  const gccGrowth: Array<{ creator_id: string; score: number }> = [];
  const byCountryGrowth = new Map<
    string,
    Array<{ creator_id: string; score: number }>
  >();

  for (const [cid, delta] of growthMap.entries()) {
    const meta = creatorMeta.get(cid);
    if (!meta) continue;
    if (meta.country_code && GCC_COUNTRIES.has(meta.country_code)) {
      gccGrowth.push({ creator_id: cid, score: delta });
    }
    if (meta.country_code) {
      const arr = byCountryGrowth.get(meta.country_code) ?? [];
      arr.push({ creator_id: cid, score: delta });
      byCountryGrowth.set(meta.country_code, arr);
    }
  }

  buildScope("fastest_gcc", gccGrowth);
  for (const [cc, arr] of byCountryGrowth.entries()) {
    buildScope(`fastest_${cc}`, arr);
  }

  // ── Platform rankings ─────────────────────────────────────────────────────

  for (const plat of PLATFORMS) {
    const entries: Array<{ creator_id: string; score: number }> = [];
    for (const [cid, followers] of platformFollowers.get(plat)!.entries()) {
      if (followers > 0) entries.push({ creator_id: cid, score: followers });
    }
    buildScope(`platform_${plat}`, entries);
  }

  // ── Genre rankings ────────────────────────────────────────────────────────

  const byGenre = new Map<string, Array<{ creator_id: string; score: number }>>();
  for (const c of creators ?? []) {
    const cid = c.id as string;
    const score = scoreMap.get(cid);
    if (score === undefined) continue;
    for (const genre of (c.genres as string[] | null) ?? []) {
      if (!genre) continue;
      const arr = byGenre.get(genre) ?? [];
      arr.push({ creator_id: cid, score });
      byGenre.set(genre, arr);
    }
  }
  for (const [genre, arr] of byGenre.entries()) {
    buildScope(`genre_${genre}`, arr);
  }

  // ── Persist ───────────────────────────────────────────────────────────────

  const { error: delErr } = await supabase
    .from("rankings")
    .delete()
    .not("id", "is", null);

  if (delErr) {
    return NextResponse.json(
      { error: "Failed to delete rankings", details: delErr.message },
      { status: 500 }
    );
  }

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error: insErr } = await supabase
      .from("rankings")
      .insert(rows.slice(i, i + CHUNK));
    if (insErr) {
      errorDetails.push({
        step: `insert_chunk_${i}`,
        msg: insErr.message,
      });
    }
  }

  const scopes = Array.from(new Set(rows.map((r) => r.scope))).sort();

  return NextResponse.json({
    ok: errorDetails.length === 0,
    total_rows: rows.length,
    scopes,
    errors: errorDetails.length,
    errorDetails,
    timestamp: computedAt,
  });
}
