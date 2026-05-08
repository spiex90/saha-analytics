/**
 * Rank Snapshot — Cron Route
 *
 * Reads today's creator_daily_scores + current platform followers,
 * then writes one row per creator into creator_rank_snapshots.
 *
 * These snapshots power the 7-day rank movement shown on the dashboard.
 * Must run AFTER compute-scores.
 *
 * Schedule: 45 3 * * *  (3:45 AM UTC — after compute-scores at 3:15)
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const errors: string[] = [];

  // Load today's scores + creator metadata
  const { data: scores, error: scoresErr } = await supabase
    .from("creator_daily_scores")
    .select(
      "creator_id, saha_score, rank_country, rank_arab_world, rank_genre, primary_genre, calculated_date, creators!inner(country_code)"
    )
    .eq("calculated_date", today);

  if (scoresErr) {
    return NextResponse.json(
      { error: `Failed to load scores: ${scoresErr.message}` },
      { status: 500 }
    );
  }

  // Load current platform followers
  const { data: platforms, error: platformsErr } = await supabase
    .from("creator_platforms")
    .select("creator_id, followers");

  if (platformsErr) {
    return NextResponse.json(
      { error: `Failed to load platforms: ${platformsErr.message}` },
      { status: 500 }
    );
  }

  // Sum followers per creator
  const followerMap = new Map<string, number>();
  for (const p of platforms ?? []) {
    const cid = p.creator_id as string;
    followerMap.set(cid, (followerMap.get(cid) ?? 0) + Number(p.followers ?? 0));
  }

  // Build snapshot rows
  type ScoreRow = {
    creator_id: string;
    saha_score: number;
    rank_country: number | null;
    rank_arab_world: number | null;
    rank_genre: number | null;
    primary_genre: string | null;
    creators: { country_code: string } | Array<{ country_code: string }>;
  };

  const snapshotRows = (scores ?? []).map((row) => {
    const r = row as unknown as ScoreRow;
    const creatorsObj = Array.isArray(r.creators) ? r.creators[0] : r.creators;
    return {
      creator_id: r.creator_id,
      country: creatorsObj?.country_code ?? null,
      primary_genre: r.primary_genre,
      rank_country: r.rank_country,
      rank_arab_world: r.rank_arab_world,
      rank_genre: r.rank_genre,
      total_followers: followerMap.get(r.creator_id) ?? 0,
      saha_score: Number(r.saha_score),
      snapshot_date: today,
    };
  });

  // Bulk upsert
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < snapshotRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("creator_rank_snapshots")
      .upsert(snapshotRows.slice(i, i + CHUNK), {
        onConflict: "creator_id,snapshot_date",
      });
    if (error) {
      errors.push(`chunk ${i}: ${error.message}`);
    } else {
      written += snapshotRows.slice(i, i + CHUNK).length;
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    written,
    errors: errors.length,
    errorDetails: errors,
    snapshot_date: today,
    timestamp: new Date().toISOString(),
  });
}
