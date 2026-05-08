import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface YTChannelResponse {
  items?: Array<{
    statistics: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
    };
  }>;
}

async function getYouTubeStats(
  handle: string
): Promise<{ subscribers: number; views: number; videos: number } | null> {
  // Try by handle first (@spiex90), then by username fallback
  const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=@${handle}&key=${process.env.YOUTUBE_API_KEY}`;
  let res = await fetch(handleUrl);
  let data = (await res.json()) as YTChannelResponse;

  if (!data.items?.length) {
    // Fallback: try forUsername
    const usernameUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forUsername=${handle}&key=${process.env.YOUTUBE_API_KEY}`;
    res = await fetch(usernameUrl);
    data = (await res.json()) as YTChannelResponse;
  }

  if (!data.items?.length) return null;

  const stats = data.items[0].statistics;
  return {
    subscribers: parseInt(stats.subscriberCount ?? "0", 10),
    views: parseInt(stats.viewCount ?? "0", 10),
    videos: parseInt(stats.videoCount ?? "0", 10),
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
    .eq("platform", "youtube");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { updated: 0, errors: 0, skipped: 0 };

  for (const platform of platforms ?? []) {
    try {
      const stats = await getYouTubeStats(
        platform.platform_username as string
      );

      if (!stats) {
        results.skipped++;
        continue;
      }

      // Update platform row
      await supabase
        .from("creator_platforms")
        .update({
          followers: stats.subscribers,
          platform_user_id:
            (platform.platform_user_id as string)?.startsWith("spiex") ||
            !platform.platform_user_id
              ? `yt_${platform.platform_username}`
              : platform.platform_user_id,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", platform.id as string);

      // Write snapshot
      await supabase.from("creator_snapshots").insert({
        creator_id: platform.creator_id as string,
        platform: "youtube",
        followers: stats.subscribers,
        taken_at: new Date().toISOString(),
      });

      results.updated++;
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
