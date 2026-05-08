import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface KickChannelResponse {
  id?: number;
  slug?: string;
  followersCount?: number;
  livestream?: {
    id: number;
    is_live?: boolean;
  } | null;
  user?: {
    id: number;
    username: string;
    profile_pic?: string;
  };
}

async function getKickStats(
  username: string
): Promise<{ followers: number; is_live: boolean; user_id: string } | null> {
  const res = await fetch(`https://kick.com/api/v1/channels/${username}`, {
    headers: {
      // Kick requires a browser-like User-Agent
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
    // No caching — always fresh
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Kick API HTTP ${res.status} for ${username}`);
  }

  const data = (await res.json()) as KickChannelResponse;
  if (!data || data.followersCount === undefined) {
    throw new Error(
      `Kick API no followersCount for ${username}: ${JSON.stringify(data).slice(0, 200)}`
    );
  }

  return {
    followers: data.followersCount ?? 0,
    is_live: data.livestream != null,
    user_id: data.id ? String(data.id) : username,
  };
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: platforms, error } = await supabase
    .from("creator_platforms")
    .select("*, creator:creators(id, approval_status)")
    .eq("platform", "kick");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { updated: number; errors: number; skipped: number; errorDetails: string[] } = { updated: 0, errors: 0, skipped: 0, errorDetails: [] };

  for (const platform of platforms ?? []) {
    try {
      const stats = await getKickStats(platform.platform_username as string);

      if (!stats) {
        results.skipped++;
        continue;
      }

      // Update platform row
      await supabase
        .from("creator_platforms")
        .update({
          followers: stats.followers,
          is_live: stats.is_live,
          platform_user_id: stats.user_id,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", platform.id as string);

      // If live, mark creator live
      if (stats.is_live) {
        await supabase
          .from("creators")
          .update({ is_live: true })
          .eq("id", platform.creator_id as string);
      }

      // Write snapshot
      await supabase.from("creator_snapshots").insert({
        creator_id: platform.creator_id as string,
        platform: "kick",
        followers: stats.followers,
        taken_at: new Date().toISOString(),
      });

      results.updated++;
    } catch (err) {
      results.errors++;
      results.errorDetails.push(String(err));
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
