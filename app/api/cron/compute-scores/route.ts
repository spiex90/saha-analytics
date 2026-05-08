import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSAHAScore } from "@/lib/score/compute";

interface CreatorPlatformRow {
  platform: string;
  followers: number;
}

interface SnapshotRow {
  platform: string;
  followers: number;
  taken_at: string;
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: creators, error } = await supabase
    .from("creators")
    .select("id")
    .eq("approval_status", "approved");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { computed: 0, errors: 0 };
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  for (const creator of creators ?? []) {
    try {
      const [{ data: platforms }, { data: snapshots }] = await Promise.all([
        supabase
          .from("creator_platforms")
          .select("platform, followers")
          .eq("creator_id", creator.id as string),
        supabase
          .from("creator_snapshots")
          .select("platform, followers, taken_at")
          .eq("creator_id", creator.id as string)
          .gte("taken_at", thirtyDaysAgo)
          .order("taken_at", { ascending: true }),
      ]);

      const totalFollowers = (platforms as CreatorPlatformRow[] ?? []).reduce(
        (sum, p) => sum + (p.followers ?? 0),
        0
      );
      const activePlatformCount = (platforms as CreatorPlatformRow[] ?? []).filter(
        (p) => p.followers > 0
      ).length;

      // Monthly growth: compare first snapshot vs latest
      const snapshotList = snapshots as SnapshotRow[] ?? [];
      const firstTotal = snapshotList.slice(0, 5).reduce((s, p) => s + p.followers, 0) / Math.max(snapshotList.slice(0, 5).length, 1);
      const lastTotal = snapshotList.slice(-5).reduce((s, p) => s + p.followers, 0) / Math.max(snapshotList.slice(-5).length, 1);
      const monthlyGrowthRate =
        firstTotal > 0 ? (lastTotal - firstTotal) / firstTotal : 0;

      const score = computeSAHAScore({
        totalFollowers,
        monthlyGrowthRate,
        snapshotCount30Days: snapshotList.length,
        activePlatformCount,
      });

      await supabase.from("creator_scores").upsert(
        {
          creator_id: creator.id as string,
          ...score,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "creator_id" }
      );

      results.computed++;
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
