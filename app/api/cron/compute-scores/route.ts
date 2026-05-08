import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSAHAScore } from "@/lib/score/compute";

interface CreatorPlatformRow {
  platform: string;
  followers: number;
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
      const [
        { data: platforms },
        { data: snapshots },
        { data: growthRow },
      ] = await Promise.all([
        supabase
          .from("creator_platforms")
          .select("platform, followers")
          .eq("creator_id", creator.id as string),
        supabase
          .from("creator_snapshots")
          .select("id")
          .eq("creator_id", creator.id as string)
          .gte("taken_at", thirtyDaysAgo),
        supabase
          .from("creator_growth")
          .select("growth_pct")
          .eq("creator_id", creator.id as string)
          .eq("period", "30d")
          .maybeSingle(),
      ]);

      const totalFollowers = (platforms as CreatorPlatformRow[] ?? []).reduce(
        (sum, p) => sum + (p.followers ?? 0),
        0
      );
      const activePlatformCount = (platforms as CreatorPlatformRow[] ?? []).filter(
        (p) => p.followers > 0
      ).length;

      // Monthly growth rate: read from creator_growth (populated by compute-growth cron).
      // growth_pct is a percentage (e.g. 5.0 = 5%); computeGrowthScore expects decimal (0.05).
      const monthlyGrowthRate = growthRow?.growth_pct
        ? Number(growthRow.growth_pct) / 100
        : 0;

      // Snapshot count for activity score (how many daily snapshots in last 30 days)
      const snapshotCount30Days = snapshots?.length ?? 0;

      const score = computeSAHAScore({
        totalFollowers,
        monthlyGrowthRate,
        snapshotCount30Days,
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
