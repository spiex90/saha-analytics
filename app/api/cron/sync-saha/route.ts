import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicAdminClient } from "@/lib/supabase/admin-public";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Platform = "twitch" | "youtube" | "tiktok" | "instagram" | "kick";
const PLATFORMS = new Set<Platform>([
  "twitch",
  "youtube",
  "tiktok",
  "instagram",
  "kick",
]);

/**
 * Daily snapshot job.
 *
 * Reads the latest platform stats from SAHA's public.platform_profiles
 * and writes them into analytics:
 *   1. Updates analytics.creator_platforms with fresh follower counts
 *   2. Writes one snapshot row per platform per day (idempotent)
 *
 * This is the ONLY route that writes to creator_snapshots.
 * Platform-specific sync routes (sync-twitch etc.) only update
 * creator_platforms.followers — they do NOT write snapshots.
 *
 * Schedule: 0 2 * * * (2 AM UTC daily)
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = createAdminClient();
  const saha = createPublicAdminClient();

  const errorDetails: Array<{ creator?: string; step: string; msg: string }> =
    [];
  let syncedCreators = 0;
  let snapshotsWritten = 0;
  let skipped = 0;

  // Get all approved creators tracked in analytics
  const { data: analyticsCreators, error: acErr } = await analytics
    .from("creators")
    .select("id, handle")
    .eq("approval_status", "approved");

  if (acErr) {
    return NextResponse.json(
      { error: "Failed to load analytics creators", details: acErr.message },
      { status: 500 }
    );
  }

  const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  for (const creator of analyticsCreators ?? []) {
    // ── 1. Find this creator in SAHA by handle ──────────────────────────────
    const { data: sahaCreator, error: scErr } = await saha
      .from("creators")
      .select("id")
      .eq("handle", creator.handle)
      .maybeSingle();

    if (scErr) {
      errorDetails.push({
        creator: creator.handle,
        step: "lookup_saha_creator",
        msg: scErr.message,
      });
      continue;
    }
    if (!sahaCreator) {
      skipped++;
      continue;
    }

    // ── 2. Get platform profiles from SAHA ──────────────────────────────────
    const { data: profiles, error: ppErr } = await saha
      .from("platform_profiles")
      .select("platform_name, username, followers, platform_user_id")
      .eq("creator_id", sahaCreator.id);

    if (ppErr) {
      errorDetails.push({
        creator: creator.handle,
        step: "load_platform_profiles",
        msg: ppErr.message,
      });
      continue;
    }
    if (!profiles?.length) {
      skipped++;
      continue;
    }

    // ── 3. Update analytics.creator_platforms with SAHA data ────────────────
    for (const profile of profiles) {
      const platform = profile.platform_name as Platform;
      if (!PLATFORMS.has(platform)) continue;

      const { error: upsertErr } = await analytics
        .from("creator_platforms")
        .upsert(
          {
            creator_id: creator.id,
            platform,
            platform_username: profile.username,
            platform_user_id: profile.platform_user_id,
            followers: Number(profile.followers ?? 0),
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "creator_id,platform" }
        );

      if (upsertErr) {
        errorDetails.push({
          creator: creator.handle,
          step: `upsert_platform_${platform}`,
          msg: upsertErr.message,
        });
      }
    }

    syncedCreators++;

    // ── 4. Check if snapshot already written today ───────────────────────────
    const { data: existingSnap } = await analytics
      .from("creator_snapshots")
      .select("id")
      .eq("creator_id", creator.id)
      .eq("snapshot_date", todayUTC)
      .limit(1);

    if (existingSnap && existingSnap.length > 0) {
      // Already snapshotted today — skip
      continue;
    }

    // ── 5. Read current platform state and write daily snapshot ─────────────
    const { data: freshPlatforms, error: fpErr } = await analytics
      .from("creator_platforms")
      .select("platform, followers, is_live")
      .eq("creator_id", creator.id);

    if (fpErr) {
      errorDetails.push({
        creator: creator.handle,
        step: "load_fresh_platforms",
        msg: fpErr.message,
      });
      continue;
    }

    const now = new Date().toISOString();
    const rows = (freshPlatforms ?? []).map((p) => ({
      creator_id: creator.id,
      platform: p.platform,
      followers: Number(p.followers ?? 0),
      views: 0,
      live_status: !!p.is_live,
      taken_at: now,
      snapshot_date: todayUTC,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await analytics
        .from("creator_snapshots")
        .insert(rows);

      if (insErr) {
        errorDetails.push({
          creator: creator.handle,
          step: "insert_snapshots",
          msg: insErr.message,
        });
      } else {
        snapshotsWritten += rows.length;
      }
    }
  }

  return NextResponse.json({
    ok: errorDetails.length === 0,
    synced_creators: syncedCreators,
    snapshots_written: snapshotsWritten,
    skipped,
    errors: errorDetails.length,
    errorDetails,
    timestamp: new Date().toISOString(),
  });
}
