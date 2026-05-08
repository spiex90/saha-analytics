/**
 * Admin — Analytics Debug Panel
 *
 * Shows the raw computed score breakdown for every creator so the
 * team can verify each metric is accurate and defensible.
 * Accessible only to admin users.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { momentumLabel, sahaScoreLabel } from "@/lib/analytics/calculate";

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS (match dashboard)
// ─────────────────────────────────────────────────────────────────
const A   = "#F4A52C";
const BRD = "#2A263A";
const BS  = "#1f1c2e";
const TX  = "#F5EFE0";
const M   = "#A7A0B8";
const M2  = "#6f6982";
const SF  = "#0F1118";
const EL  = "#19162A";
const UP  = "#6ec98c";
const DN  = "#d96a6a";
const MONO = "var(--font-mono), ui-monospace, monospace";

function Badge({ value, of100 }: { value: number; of100?: boolean }) {
  const pct = of100 ? value : (value / 100) * 100;
  const color = pct >= 75 ? UP : pct >= 50 ? A : pct >= 25 ? M : DN;
  return (
    <span style={{
      display: "inline-block", fontFamily: MONO, fontSize: 12,
      fontVariantNumeric: "tabular-nums", color,
      background: `${color}18`, border: `1px solid ${color}30`,
      borderRadius: 4, padding: "1px 7px", minWidth: 46, textAlign: "right",
    }}>
      {value.toFixed(1)}
    </span>
  );
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 75 ? UP : pct >= 50 ? A : pct >= 25 ? M : DN;
  return (
    <div style={{ width: 80, height: 4, background: BS, borderRadius: 2, overflow: "hidden", display: "inline-block", verticalAlign: "middle" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}

export default async function AnalyticsDebugPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/dashboard");

  // Use admin client to bypass RLS
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: scores } = await admin
    .from("creator_daily_scores")
    .select(
      "creator_id, saha_score, growth_score, momentum_score, consistency_score, presence_score, rank_score, rank_country, rank_arab_world, rank_genre, calculated_date, creators!inner(handle, name_en, name_ar, country_code)"
    )
    .eq("calculated_date", today)
    .order("saha_score", { ascending: false });

  const { data: platforms } = await admin
    .from("creator_platforms")
    .select("creator_id, platform, followers, last_synced_at");

  const { data: growth } = await admin
    .from("creator_growth")
    .select("creator_id, period, followers_start, followers_end")
    .in("period", ["7d", "30d"]);

  // Maps
  const platMap = new Map<string, Array<{ platform: string; followers: number; last_synced_at: string | null }>>();
  for (const p of platforms ?? []) {
    const arr = platMap.get(p.creator_id as string) ?? [];
    arr.push({ platform: p.platform as string, followers: Number(p.followers), last_synced_at: p.last_synced_at as string | null });
    platMap.set(p.creator_id as string, arr);
  }

  const growthMap = new Map<string, { g7: number | null; g30: number | null }>();
  for (const g of growth ?? []) {
    const cid = g.creator_id as string;
    const prev = growthMap.get(cid) ?? { g7: null, g30: null };
    const start = Number(g.followers_start);
    const end = Number(g.followers_end);
    const pct = start > 0 ? ((end - start) / start) * 100 : null;
    if (g.period === "7d") growthMap.set(cid, { ...prev, g7: pct });
    else if (g.period === "30d") growthMap.set(cid, { ...prev, g30: pct });
  }

  type CreatorObj = { handle: string; name_en: string; name_ar: string; country_code: string };
  type ScoreRowRaw = {
    creator_id: string;
    saha_score: number;
    growth_score: number;
    momentum_score: number;
    consistency_score: number;
    presence_score: number;
    rank_score: number;
    rank_country: number | null;
    rank_arab_world: number | null;
    rank_genre: number | null;
    calculated_date: string;
    creators: CreatorObj | CreatorObj[];
  };

  const rows = (scores ?? []) as unknown as ScoreRowRaw[];
  const lastRun = rows[0]?.calculated_date ?? "No data yet";

  // Count creators with < 7 days of snapshots
  const { data: snapshotCounts } = await admin
    .from("creator_snapshots")
    .select("creator_id, snapshot_date")
    .gte("snapshot_date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

  const recentCreatorSet = new Set((snapshotCounts ?? []).map((s) => s.creator_id as string));
  const noHistoryCount = rows.filter((r) => !recentCreatorSet.has(r.creator_id)).length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <div style={{ flex: 1, padding: "32px 40px", fontFamily: "var(--font-inter), sans-serif", minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: M, fontWeight: 500, marginBottom: 8 }}>
            Admin · Analytics Engine
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: TX }}>
            Score Debug Panel
          </h1>
          <div style={{ marginTop: 8, display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: M }}>
              Last run: <span style={{ color: TX, fontFamily: MONO }}>{lastRun}</span>
            </span>
            <span style={{ fontSize: 12.5, color: M }}>
              Creators scored: <span style={{ color: TX, fontFamily: MONO }}>{rows.length}</span>
            </span>
            {noHistoryCount > 0 && (
              <span style={{ fontSize: 12.5, color: DN }}>
                ⚠ {noHistoryCount} creators with insufficient history
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "SAHA Score", note: "Final composite (0–100)" },
            { label: "Growth", note: "30d growth % → score" },
            { label: "Momentum", note: "7d accel + activity" },
            { label: "Consistency", note: "Activity + schedule" },
            { label: "Presence", note: "Platform count" },
            { label: "Rank", note: "Percentile rank score" },
          ].map(({ label, note }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 11, color: M, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
              <span style={{ fontSize: 10.5, color: M2 }}>{note}</span>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: M }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, color: TX, marginBottom: 8 }}>No scores computed yet</div>
            <div style={{ fontSize: 13, color: M }}>
              Run <code style={{ fontFamily: MONO, background: EL, padding: "2px 6px", borderRadius: 4 }}>/api/cron/compute-scores</code> to generate today&apos;s scores.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRD}` }}>
                  {["#", "Creator", "Country", "SAHA", "Label", "Growth", "Momentum", "Consist.", "Presence", "Rank Sc.", "🌍 Arab", "🗺 Country", "📊 Genre", "7d %", "30d %", "Followers", "Last Sync"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: M2, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const plats = platMap.get(row.creator_id) ?? [];
                  const totalFollowers = plats.reduce((s, p) => s + p.followers, 0);
                  const lastSync = plats
                    .map((p) => p.last_synced_at)
                    .filter(Boolean)
                    .sort()
                    .pop();
                  const lastSyncLabel = lastSync
                    ? new Date(lastSync).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "—";
                  const growthData = growthMap.get(row.creator_id);
                  const noHistory = !recentCreatorSet.has(row.creator_id);

                  return (
                    <tr key={row.creator_id} style={{
                      borderBottom: `1px solid ${BS}`,
                      background: idx % 2 === 0 ? "transparent" : `${EL}44`,
                    }}>
                      <td style={{ padding: "10px 12px", color: M2, fontFamily: MONO }}>{idx + 1}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {(() => {
                          const c: CreatorObj = Array.isArray(row.creators) ? row.creators[0] : row.creators;
                          return (<>
                            <div style={{ color: TX, fontWeight: 500 }}>{c.name_ar || c.handle}</div>
                            <div style={{ color: M2, fontSize: 11, fontFamily: MONO }}>@{c.handle}</div>
                          </>);
                        })()}
                        {noHistory && (
                          <div style={{ color: DN, fontSize: 10, marginTop: 2 }}>⚠ no history</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: M, fontFamily: MONO, fontSize: 11 }}>
                        {(Array.isArray(row.creators) ? row.creators[0] : row.creators)?.country_code}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge value={Number(row.saha_score)} of100 />
                          <ScoreBar value={Number(row.saha_score)} />
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 11, color: Number(row.saha_score) >= 75 ? A : M }}>
                          {sahaScoreLabel(Number(row.saha_score))}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}><Badge value={Number(row.growth_score)} of100 /></td>
                      <td style={{ padding: "10px 12px" }}>
                        <div>
                          <Badge value={Number(row.momentum_score)} of100 />
                          <div style={{ fontSize: 10, color: M2, marginTop: 2 }}>
                            {momentumLabel(Number(row.momentum_score))}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}><Badge value={Number(row.consistency_score)} of100 /></td>
                      <td style={{ padding: "10px 12px" }}><Badge value={Number(row.presence_score)} of100 /></td>
                      <td style={{ padding: "10px 12px" }}><Badge value={Number(row.rank_score)} of100 /></td>
                      <td style={{ padding: "10px 12px", color: M, fontFamily: MONO }}>
                        {row.rank_arab_world ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: M, fontFamily: MONO }}>
                        {row.rank_country ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: M, fontFamily: MONO }}>
                        {row.rank_genre ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {growthData?.g7 !== null && growthData?.g7 !== undefined ? (
                          <span style={{ color: (growthData.g7 ?? 0) >= 0 ? UP : DN, fontFamily: MONO }}>
                            {(growthData.g7 ?? 0) >= 0 ? "+" : ""}{growthData.g7?.toFixed(1)}%
                          </span>
                        ) : <span style={{ color: M2 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {growthData?.g30 !== null && growthData?.g30 !== undefined ? (
                          <span style={{ color: (growthData.g30 ?? 0) >= 0 ? UP : DN, fontFamily: MONO }}>
                            {(growthData.g30 ?? 0) >= 0 ? "+" : ""}{growthData.g30?.toFixed(1)}%
                          </span>
                        ) : <span style={{ color: M2 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: MONO, color: TX }}>
                        {totalFollowers >= 1000000
                          ? `${(totalFollowers / 1000000).toFixed(1)}M`
                          : totalFollowers >= 1000
                          ? `${(totalFollowers / 1000).toFixed(0)}K`
                          : totalFollowers}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: MONO, fontSize: 11, color: M2, whiteSpace: "nowrap" }}>
                        {lastSyncLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Calculation reference */}
        <div style={{ marginTop: 40, padding: 24, background: EL, border: `1px solid ${BRD}`, borderRadius: 12, maxWidth: 720 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: M2, marginBottom: 14 }}>Formula Reference</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
            {[
              ["SAHA Score", "Growth×0.30 + Momentum×0.25 + Rank×0.20 + Consistency×0.15 + Presence×0.10 + Penalty"],
              ["Growth Score", "Piecewise linear on 30d growth% (0%=30, 5%=75, 10%+=100)"],
              ["Momentum Score", "50% 7d growth rate + 35% acceleration vs prior 7d + 15% activity"],
              ["Consistency Score", "Fallback: has-schedule+live-7d=75, live-14d=60, schedule-only=45, else=20"],
              ["Presence Score", "1 platform=35, 2=55, 3=70, 4=85, 5+=100. +5 if verified"],
              ["Rank Score", "Average percentile across country/arab/genre (rank-1)/total"],
              ["Inactivity Penalty", "Inactive 30d: −5 · Inactive 60d+: −12"],
            ].map(([label, formula]) => (
              <div key={label} style={{ display: "flex", gap: 16 }}>
                <span style={{ color: A, width: 150, flexShrink: 0, fontWeight: 500 }}>{label}</span>
                <span style={{ color: M }}>{formula}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
