import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PERIODS: Array<{ period: "1d" | "7d" | "30d" | "90d"; daysAgo: number }> =
  [
    { period: "1d", daysAgo: 1 },
    { period: "7d", daysAgo: 7 },
    { period: "30d", daysAgo: 30 },
    { period: "90d", daysAgo: 90 },
  ];

/**
 * Compute 1d / 7d / 30d / 90d follower growth for every approved creator.
 *
 * Strategy:
 *   - "followers_end"   = current total from creator_platforms (live data)
 *   - "followers_start" = sum of latest snapshot per platform within a ±2-day
 *                         window around the target date
 *
 * Upserts into analytics.creator_growth (PK: creator_id, period).
 *
 * Schedule: 0 3 * * * (3 AM UTC daily, after sync-saha at 2 AM)
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const errorDetails: Array<{
    creator?: string;
    period?: string;
    step: string;
    msg: string;
  }> = [];
  let computed = 0;

  const { data: creators, error: creatorsErr } = await supabase
    .from("creators")
    .select("id, handle")
    .eq("approval_status", "approved");

  if (creatorsErr) {
    return NextResponse.json(
      { error: "Failed to load creators", details: creatorsErr.message },
      { status: 500 }
    );
  }

  const nowMs = Date.now();

  for (const creator of creators ?? []) {
    // Current total followers (live from creator_platforms)
    const { data: platforms, error: platformsErr } = await supabase
      .from("creator_platforms")
      .select("platform, followers")
      .eq("creator_id", creator.id);

    if (platformsErr) {
      errorDetails.push({
        creator: creator.handle,
        step: "load_platforms",
        msg: platformsErr.message,
      });
      continue;
    }

    const followersEnd = (platforms ?? []).reduce(
      (sum, p) => sum + Number(p.followers ?? 0),
      0
    );

    for (const { period, daysAgo } of PERIODS) {
      // Window around the target date: target ± 2 days
      const targetMs = nowMs - daysAgo * 24 * 60 * 60 * 1000;
      const fromDate = new Date(targetMs - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const toDate = new Date(targetMs + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      // Snapshots within the window, newest first
      const { data: snapshots, error: snapErr } = await supabase
        .from("creator_snapshots")
        .select("platform, followers, snapshot_date")
        .eq("creator_id", creator.id)
        .gte("snapshot_date", fromDate)
        .lte("snapshot_date", toDate)
        .order("snapshot_date", { ascending: false });

      if (snapErr) {
        errorDetails.push({
          creator: creator.handle,
          period,
          step: "load_snapshots",
          msg: snapErr.message,
        });
        continue;
      }

      if (!snapshots?.length) continue; // No history yet — skip this period

      // Latest per platform within the window
      const seen = new Map<string, number>();
      for (const s of snapshots) {
        if (!seen.has(s.platform)) {
          seen.set(s.platform, Number(s.followers ?? 0));
        }
      }

      const followersStart = Array.from(seen.values()).reduce(
        (a, b) => a + b,
        0
      );
      if (followersStart === 0) continue;

      const { error: upsertErr } = await supabase
        .from("creator_growth")
        .upsert(
          {
            creator_id: creator.id,
            period,
            followers_start: followersStart,
            followers_end: followersEnd,
            computed_at: new Date().toISOString(),
          },
          { onConflict: "creator_id,period" }
        );

      if (upsertErr) {
        errorDetails.push({
          creator: creator.handle,
          period,
          step: "upsert_growth",
          msg: upsertErr.message,
        });
        continue;
      }

      computed++;
    }
  }

  return NextResponse.json({
    ok: errorDetails.length === 0,
    computed,
    errors: errorDetails.length,
    errorDetails,
    timestamp: new Date().toISOString(),
  });
}
