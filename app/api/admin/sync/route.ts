import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SyncBody {
  creator_id: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile?.role as string) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as SyncBody;
  const { creator_id } = body;

  if (!creator_id) {
    return NextResponse.json({ error: "creator_id required" }, { status: 400 });
  }

  // Trigger the sync-twitch cron inline for a specific creator
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/cron/sync-twitch`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "x-creator-id": creator_id,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Sync request failed" },
      { status: res.status }
    );
  }

  const result = await res.json() as Record<string, unknown>;
  return NextResponse.json({ ok: true, ...result });
}
