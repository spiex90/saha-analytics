import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

interface TwitchStream {
  user_id: string;
  user_login: string;
  type: string;
}

interface TwitchFollowersResponse {
  total: number;
}

interface TwitchTokenResponse {
  access_token: string;
}

async function getTwitchToken(): Promise<string> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });
  const data = (await res.json()) as TwitchTokenResponse;
  return data.access_token;
}

async function getTwitchFollowers(
  userId: string,
  token: string
): Promise<number> {
  const res = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`,
    {
      headers: {
        "Client-Id": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) return 0;
  const data = (await res.json()) as TwitchFollowersResponse;
  return data.total ?? 0;
}

async function getLiveStreams(
  userLogins: string[],
  token: string
): Promise<Set<string>> {
  if (!userLogins.length) return new Set();
  const params = userLogins.map((l) => `user_login=${l}`).join("&");
  const res = await fetch(
    `https://api.twitch.tv/helix/streams?${params}&first=100`,
    {
      headers: {
        "Client-Id": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) return new Set();
  const data = (await res.json()) as { data: TwitchStream[] };
  return new Set(
    (data.data ?? [])
      .filter((s) => s.type === "live")
      .map((s) => s.user_login.toLowerCase())
  );
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch creators with Twitch platform
  const { data: platforms, error } = await supabase
    .from("creator_platforms")
    .select("*, creator:creators(id, approval_status)")
    .eq("platform", "twitch");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const token = await getTwitchToken();
  const userLogins = (platforms ?? []).map(
    (p: { platform_username: string }) => p.platform_username.toLowerCase()
  );
  const liveSet = await getLiveStreams(userLogins, token);

  const results = { updated: 0, errors: 0 };

  for (const platform of platforms ?? []) {
    try {
      const followers = await getTwitchFollowers(
        platform.platform_user_id as string,
        token
      );
      const is_live = liveSet.has(
        (platform.platform_username as string).toLowerCase()
      );

      // Update creator_platforms
      await supabase
        .from("creator_platforms")
        .update({
          followers,
          is_live,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", platform.id as string);

      // Update creator is_live (aggregate any platform being live)
      if (is_live) {
        await supabase
          .from("creators")
          .update({ is_live: true })
          .eq("id", platform.creator_id as string);
      }

      // Snapshots are written once daily by sync-saha, not here.
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
