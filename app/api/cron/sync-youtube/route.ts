import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface YTChannelResponse {
  items?: Array<{
    id: string;
    statistics: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
    };
  }>;
}

async function getYouTubeStats(
  handle: string
): Promise<{
  subscribers: number;
  views: number;
  videos: number;
  channelId?: string;
} | null> {
  // Try by handle first (@spiex90), then by username fallback
  const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=@${handle}&key=${process.env.YOUTUBE_API_KEY}`;
  let res = await fetch(handleUrl);
  let data = (await res.json()) as YTChannelResponse & {
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`YouTube API error (handle): ${data.error.message}`);
  }

  if (!data.items?.length) {
    // Fallback: try forUsername
    const usernameUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forUsername=${handle}&key=${process.env.YOUTUBE_API_KEY}`;
    res = await fetch(usernameUrl);
    data = (await res.json()) as YTChannelResponse & {
      error?: { message: string };
    };
    if (data.error) {
      throw new Error(`YouTube API error (username): ${data.error.message}`);
    }
  }

  if (!data.items?.length) {
    throw new Error(`No YouTube channel found for handle: ${handle}`);
  }

  const channel = data.items[0];
  const stats = channel.statistics;
  return {
    subscribers: parseInt(stats.subscriberCount ?? "0", 10),
    views: parseInt(stats.viewCount ?? "0", 10),
    videos: parseInt(stats.videoCount ?? "0", 10),
    channelId: channel.id,
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

  const results: { updated: number; errors: number; skipped: number; errorDetails: string[] } = { updated: 0, errors: 0, skipped: 0, errorDetails: [] };

  for (const platform of platforms ?? []) {
    try {
      const stats = await getYouTubeStats(
        platform.platform_username as string
      );

      if (!stats) {
        results.skipped++;
        continue;
      }

      // Update platform row — store real YouTube channel ID if we got one
      const updatePayload: Record<string, unknown> = {
        followers: stats.subscribers,
        last_synced_at: new Date().toISOString(),
      };
      if (stats.channelId) {
        updatePayload.platform_user_id = stats.channelId;
      }
      await supabase
        .from("creator_platforms")
        .update(updatePayload)
        .eq("id", platform.id as string);

      // Write snapshot
      await supabase.from("creator_snapshots").insert({
        creator_id: platform.creator_id as string,
        platform: "youtube",
        followers: stats.subscribers,
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
