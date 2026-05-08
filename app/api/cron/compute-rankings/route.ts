import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RawScoreRow {
  creator_id: string;
  final_score: number;
  // Supabase join returns as array for !inner joins
  creator: Array<{ country_code: string; approval_status: string }>;
}

function getCreatorCountry(row: RawScoreRow): string | null {
  const c = Array.isArray(row.creator) ? row.creator[0] : row.creator;
  return (c as { country_code?: string } | null)?.country_code ?? null;
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("creator_scores")
    .select(
      "creator_id, final_score, creator:creators!inner(country_code, approval_status)"
    )
    .order("final_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scores = (data ?? []) as unknown as RawScoreRow[];

  // Filter to approved only
  const approved = scores.filter((s) => {
    const c = Array.isArray(s.creator) ? s.creator[0] : s.creator;
    return (c as { approval_status?: string } | null)?.approval_status === "approved";
  });

  const now = new Date().toISOString();

  // GCC ranking
  const gccRows = approved.map((s, idx) => ({
    creator_id: s.creator_id,
    scope: "gcc",
    country_code: getCreatorCountry(s),
    rank: idx + 1,
    score: s.final_score,
    computed_at: now,
  }));

  // Per-country rankings
  const countryMap = new Map<string, RawScoreRow[]>();
  for (const s of approved) {
    const cc = getCreatorCountry(s);
    if (!cc) continue;
    if (!countryMap.has(cc)) countryMap.set(cc, []);
    countryMap.get(cc)!.push(s);
  }

  const countryRows: {
    creator_id: string;
    scope: string;
    country_code: string;
    rank: number;
    score: number;
    computed_at: string;
  }[] = [];

  for (const [cc, list] of countryMap.entries()) {
    list
      .sort((a, b) => b.final_score - a.final_score)
      .forEach((s, idx) => {
        countryRows.push({
          creator_id: s.creator_id,
          scope: "kuwait",
          country_code: cc,
          rank: idx + 1,
          score: s.final_score,
          computed_at: now,
        });
      });
  }

  const allRows = [...gccRows, ...countryRows];

  if (allRows.length) {
    await supabase
      .from("rankings")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("rankings").insert(allRows);
  }

  return NextResponse.json({
    ok: true,
    gcc: gccRows.length,
    country: countryRows.length,
    timestamp: now,
  });
}
