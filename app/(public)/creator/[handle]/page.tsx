import { notFound } from "next/navigation";
import Image from "next/image";
import { HeaderPublic } from "@/components/layout/header-public";
import { SAHAScoreRing } from "@/components/creator/saha-score-ring";
import { ScoreBreakdown } from "@/components/creator/score-breakdown";
import { LiveIndicator } from "@/components/creator/live-indicator";
import { PlatformGrowthChart } from "@/components/charts/platform-growth-chart";
import type { PlatformSeries } from "@/components/charts/platform-growth-chart";
import { createClient } from "@/lib/supabase/server";
import { formatFollowers } from "@/lib/utils/format";
import { getCountry } from "@/lib/constants/countries";
import { getPlatform } from "@/lib/constants/platforms";
import type { CreatorSnapshot } from "@/lib/types";

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

function StatDelta({
  value,
  suffix = "",
}: {
  value: number | null;
  suffix?: string;
}) {
  if (value === null)
    return <span className="text-[#4A4560] text-xs">—</span>;
  const isPos = value >= 0;
  return (
    <span
      className={`text-xs font-medium ${
        isPos ? "text-[#3FB950]" : "text-[#FF3B3B]"
      }`}
    >
      {isPos ? "+" : ""}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { handle } = await params;
  const supabase = await createClient();

  // ── Fetch creator + platforms + score ──────────────────────────────────────
  const { data: creator, error } = await supabase
    .from("creators")
    .select(`*, platforms:creator_platforms(*), score:creator_scores(*)`)
    .eq("handle", handle)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (error || !creator) notFound();

  // ── Fetch rankings ─────────────────────────────────────────────────────────
  const { data: rankings } = await supabase
    .from("rankings")
    .select("scope, rank, score")
    .eq("creator_id", creator.id);

  // ── Fetch growth data ──────────────────────────────────────────────────────
  const { data: growth } = await supabase
    .from("creator_growth")
    .select("period, followers_delta, growth_pct, followers_start, followers_end")
    .eq("creator_id", creator.id);

  // ── Fetch snapshots for chart ──────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: snapshots } = await supabase
    .from("creator_snapshots")
    .select("platform, followers, snapshot_date")
    .eq("creator_id", creator.id)
    .gte("snapshot_date", thirtyDaysAgo)
    .order("snapshot_date", { ascending: true });

  // ── Derived values ─────────────────────────────────────────────────────────
  const country = getCountry(creator.country_code as string);
  const score = creator.score as {
    final_score: number;
    audience_score: number;
    growth_score: number;
    activity_score: number;
    diversity_score: number;
  } | null;

  const rankingList = (rankings ?? []) as Array<{
    scope: string;
    rank: number;
    score: number;
  }>;
  const growthList = (growth ?? []) as Array<{
    period: string;
    followers_delta: number;
    growth_pct: string;
  }>;

  const countryCode = creator.country_code as string;
  const countryRank = rankingList.find(
    (r) => r.scope === `country_${countryCode}`
  )?.rank;
  const gccRank = rankingList.find((r) => r.scope === "gcc")?.rank;
  const fastestKuwait = rankingList.find(
    (r) => r.scope === `fastest_${countryCode}`
  )?.rank;

  const totalFollowers = (
    creator.platforms as Array<{ followers: number }> ?? []
  ).reduce((sum, p) => sum + (p.followers ?? 0), 0);

  const growthMap = new Map(growthList.map((g) => [g.period, g]));
  const delta30d = growthMap.get("30d")?.followers_delta ?? null;
  const delta7d = growthMap.get("7d")?.followers_delta ?? null;
  const delta1d = growthMap.get("1d")?.followers_delta ?? null;
  const pct30d = growthMap.get("30d")?.growth_pct
    ? Number(growthMap.get("30d")!.growth_pct)
    : null;

  // Build per-platform chart series
  const platformSeries: PlatformSeries = {};
  for (const snap of (snapshots as CreatorSnapshot[] & { snapshot_date: string }[]) ?? []) {
    const plat = (snap as unknown as { platform: string; followers: number; snapshot_date: string }).platform;
    const date = (snap as unknown as { snapshot_date: string }).snapshot_date;
    const followers = (snap as unknown as { followers: number }).followers;
    if (!platformSeries[plat]) platformSeries[plat] = [];
    platformSeries[plat].push({ date, followers });
  }

  const platforms = creator.platforms as Array<{
    id: string;
    platform: string;
    followers: number;
    platform_username: string;
    is_live: boolean;
  }>;

  // For platform cards: 7d delta per platform (from snapshots)
  const platformDeltas = new Map<string, number | null>();
  for (const p of platforms ?? []) {
    const series = platformSeries[p.platform];
    if (!series || series.length < 2) {
      platformDeltas.set(p.platform, null);
    } else {
      const oldest = series[0].followers;
      const newest = series[series.length - 1].followers;
      platformDeltas.set(p.platform, newest - oldest);
    }
  }

  const countryLabel = country?.name_en ?? countryCode;
  const countryFlag = country?.flag ?? "";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderPublic />

      <main className="max-w-4xl mx-auto w-full px-4 py-8 space-y-4">

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <div className="relative border border-[#2A263A] bg-[#0F1118] overflow-hidden">
          {/* Rank watermark */}
          {countryRank && (
            <div
              className="absolute -right-4 -top-4 font-serif text-[160px] leading-none select-none pointer-events-none"
              style={{ color: "rgba(244,165,44,0.04)" }}
            >
              #{countryRank}
            </div>
          )}

          <div className="relative p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              {creator.avatar_url ? (
                <Image
                  src={creator.avatar_url as string}
                  alt={creator.name_en as string}
                  width={72}
                  height={72}
                  className="object-cover shrink-0"
                />
              ) : (
                <div className="w-[72px] h-[72px] bg-[#19162A] flex items-center justify-center text-[#A7A0B8] font-serif text-3xl shrink-0">
                  {(creator.name_en as string)[0]?.toUpperCase()}
                </div>
              )}

              {/* Name + metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-serif text-2xl text-[#F5EFE0]">
                    {creator.name_en as string}
                  </h1>
                  {creator.is_verified && (
                    <span className="text-[#F4A52C] text-sm" title="Verified">
                      ✓
                    </span>
                  )}
                  <LiveIndicator isLive={creator.is_live as boolean} />
                </div>

                {creator.name_ar && (
                  <p
                    className="font-serif text-base text-[#A7A0B8] mt-0.5"
                    dir="rtl"
                    lang="ar"
                  >
                    {creator.name_ar as string}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-[#A7A0B8]">
                    {countryFlag} {countryLabel}
                  </span>
                  {(creator.genres as string[] ?? []).map((g: string) => (
                    <span
                      key={g}
                      className="text-xs text-[#A7A0B8] border border-[#2A263A] px-2 py-0.5"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* SAHA Score ring — desktop only */}
              {score && (
                <div className="shrink-0 hidden sm:block text-center">
                  <SAHAScoreRing score={score.final_score} size={64} />
                  <div className="text-center text-[10px] text-[#4A4560] mt-1 uppercase tracking-widest">
                    SAHA Score
                  </div>
                </div>
              )}
            </div>

            {/* ── RANK DISPLAY ──────────────────────────────────────────────── */}
            <div className="mt-5 flex items-end gap-6 flex-wrap">
              {countryRank && (
                <div>
                  <div className="text-[10px] text-[#A7A0B8] uppercase tracking-widest mb-0.5">
                    {countryFlag} {countryLabel}
                  </div>
                  <div className="font-serif text-5xl text-[#F4A52C] leading-none">
                    #{countryRank}
                  </div>
                </div>
              )}
              {gccRank && (
                <div>
                  <div className="text-[10px] text-[#A7A0B8] uppercase tracking-widest mb-0.5">
                    🌍 GCC
                  </div>
                  <div className="font-serif text-3xl text-[#F5EFE0] leading-none">
                    #{gccRank}
                  </div>
                </div>
              )}
              {fastestKuwait && (
                <div className="ml-auto">
                  <div className="inline-flex items-center gap-1.5 border border-[#3FB950]/30 bg-[#3FB950]/5 px-3 py-1.5">
                    <span className="text-[#3FB950] text-xs">↑</span>
                    <span className="text-xs text-[#3FB950] font-medium uppercase tracking-wider">
                      #{fastestKuwait} Fastest Growing
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MOMENTUM STRIP ────────────────────────────────────────────────── */}
        <div className="border border-[#2A263A] divide-x divide-[#2A263A] flex">
          <div className="flex-1 px-4 py-3 text-center">
            <div className="text-[10px] text-[#A7A0B8] uppercase tracking-widest mb-1">
              Today
            </div>
            <StatDelta value={delta1d} />
          </div>
          <div className="flex-1 px-4 py-3 text-center">
            <div className="text-[10px] text-[#A7A0B8] uppercase tracking-widest mb-1">
              7 Days
            </div>
            <StatDelta value={delta7d} />
          </div>
          <div className="flex-1 px-4 py-3 text-center">
            <div className="text-[10px] text-[#A7A0B8] uppercase tracking-widest mb-1">
              30 Days
            </div>
            {delta30d !== null ? (
              <div className="flex items-center justify-center gap-1.5">
                <StatDelta value={delta30d} />
                {pct30d !== null && (
                  <span
                    className={`text-xs ${
                      pct30d >= 0 ? "text-[#3FB950]" : "text-[#FF3B3B]"
                    }`}
                  >
                    ({pct30d >= 0 ? "+" : ""}
                    {pct30d.toFixed(1)}%)
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[#4A4560] text-xs">collecting</span>
            )}
          </div>
          <div className="flex-1 px-4 py-3 text-center">
            <div className="text-[10px] text-[#A7A0B8] uppercase tracking-widest mb-1">
              Total
            </div>
            <span className="text-sm font-medium text-[#F5EFE0] tabular-nums">
              {formatFollowers(totalFollowers)}
            </span>
          </div>
        </div>

        {/* ── PLATFORMS ─────────────────────────────────────────────────────── */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {platforms.map((p) => {
              const platform = getPlatform(p.platform);
              const delta = platformDeltas.get(p.platform);
              const urls: Record<string, string> = {
                twitch: `https://twitch.tv/${p.platform_username}`,
                youtube: `https://youtube.com/@${p.platform_username}`,
                tiktok: `https://tiktok.com/@${p.platform_username}`,
                instagram: `https://instagram.com/${p.platform_username}`,
                kick: `https://kick.com/${p.platform_username}`,
              };
              return (
                <a
                  key={p.id}
                  href={urls[p.platform]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#2A263A] bg-[#0F1118] p-4 text-center group hover:border-[#F4A52C]/30 transition-colors"
                >
                  <div
                    className="text-[10px] font-medium mb-2 uppercase tracking-widest flex items-center justify-center gap-1"
                    style={{ color: platform?.color ?? "#A7A0B8" }}
                  >
                    {platform?.label ?? p.platform}
                    {p.is_live && (
                      <span className="w-1.5 h-1.5 bg-[#FF3B3B] rounded-full live-pulse" />
                    )}
                  </div>
                  <div className="font-serif text-xl text-[#F5EFE0]">
                    {formatFollowers(p.followers)}
                  </div>
                  <div className="text-[10px] text-[#4A4560] mt-0.5 truncate">
                    @{p.platform_username}
                  </div>
                  {/* Growth delta */}
                  <div className="mt-2 text-[10px]">
                    {delta !== null ? (
                      <StatDelta value={delta} />
                    ) : (
                      <span className="text-[#4A4560]">—</span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* ── GROWTH CHART ──────────────────────────────────────────────────── */}
        <div className="border border-[#2A263A] bg-[#0F1118] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-sm text-[#A7A0B8] uppercase tracking-widest">
              30-Day Growth
            </h2>
            <div className="flex items-center gap-3">
              {Object.keys(platformSeries)
                .filter((p) => platformSeries[p].length >= 2)
                .map((p) => {
                  const platform = getPlatform(p);
                  return (
                    <div key={p} className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-[2px] inline-block"
                        style={{ background: platform?.color ?? "#A7A0B8" }}
                      />
                      <span className="text-[10px] text-[#4A4560]">
                        {platform?.label ?? p}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
          <PlatformGrowthChart series={platformSeries} height={180} />
        </div>

        {/* ── SCORE BREAKDOWN ───────────────────────────────────────────────── */}
        {score && (
          <ScoreBreakdown
            finalScore={score.final_score}
            audienceScore={score.audience_score}
            growthScore={score.growth_score}
            activityScore={score.activity_score}
            diversityScore={score.diversity_score}
          />
        )}

        {/* ── EXTERNAL LINKS ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => {
            const platform = getPlatform(p.platform);
            const urls: Record<string, string> = {
              twitch: `https://twitch.tv/${p.platform_username}`,
              youtube: `https://youtube.com/@${p.platform_username}`,
              tiktok: `https://tiktok.com/@${p.platform_username}`,
              instagram: `https://instagram.com/${p.platform_username}`,
              kick: `https://kick.com/${p.platform_username}`,
            };
            const url = urls[p.platform];
            if (!url) return null;
            return (
              <a
                key={p.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-8 px-4 text-xs border border-[#2A263A] text-[#A7A0B8] hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
              >
                {platform?.label ?? p.platform} ↗
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
