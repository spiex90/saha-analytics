import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { HeaderPublic } from "@/components/layout/header-public";
import { SAHAScoreRing } from "@/components/creator/saha-score-ring";
import { RankBadge } from "@/components/creator/rank-badge";
import { LiveIndicator } from "@/components/creator/live-indicator";
import { GrowthLine } from "@/components/charts/growth-line";
import { createClient } from "@/lib/supabase/server";
import { formatFollowers, formatGrowth } from "@/lib/utils/format";
import { getCountry } from "@/lib/constants/countries";
import { getPlatform } from "@/lib/constants/platforms";
import type { CreatorSnapshot } from "@/lib/types";

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { handle } = await params;
  const supabase = await createClient();

  // Fetch creator
  const { data: creator, error } = await supabase
    .from("creators")
    .select(
      `
      *,
      platforms:creator_platforms(*),
      score:creator_scores(*),
      kuwait_ranking:rankings!inner(rank, scope)
      `
    )
    .eq("handle", handle)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (error || !creator) notFound();

  // Fetch 30 days snapshots for the primary platform
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: snapshots } = await supabase
    .from("creator_snapshots")
    .select("*")
    .eq("creator_id", creator.id)
    .gte("taken_at", thirtyDaysAgo)
    .order("taken_at", { ascending: true });

  const country = getCountry(creator.country_code);
  const score = creator.score?.final_score ?? 0;

  // Aggregate daily total followers from snapshots
  const dailyMap = new Map<string, number>();
  (snapshots as CreatorSnapshot[] ?? []).forEach((s) => {
    const day = s.taken_at.substring(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + s.followers);
  });
  const chartData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Growth calcs
  const totalFollowers = (creator.platforms ?? []).reduce(
    (sum: number, p: { followers: number }) => sum + (p.followers ?? 0),
    0
  );
  const firstDay = chartData[0]?.value ?? totalFollowers;
  const lastDay = chartData[chartData.length - 1]?.value ?? totalFollowers;
  const monthlyGrowthRate =
    firstDay > 0 ? (lastDay - firstDay) / firstDay : 0;

  // Weekly growth (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const weeklyData = chartData.filter((d) => d.date >= sevenDaysAgo);
  const weeklyFirst = weeklyData[0]?.value ?? lastDay;
  const weeklyGrowthRate =
    weeklyFirst > 0 ? (lastDay - weeklyFirst) / weeklyFirst : 0;

  // Ranks
  const kuwaitRank = (creator.kuwait_ranking as { rank: number; scope: string }[] | null)?.find(
    (r) => r.scope === "kuwait"
  )?.rank;
  const gccRank = (creator.kuwait_ranking as { rank: number; scope: string }[] | null)?.find(
    (r) => r.scope === "gcc"
  )?.rank;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderPublic />

      <main className="max-w-5xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Hero */}
        <div className="flex items-start gap-6">
          {creator.avatar_url ? (
            <Image
              src={creator.avatar_url as string}
              alt={creator.name_en as string}
              width={80}
              height={80}
              className="object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 bg-[#19162A] flex items-center justify-center text-[#A7A0B8] font-serif text-3xl shrink-0">
              {(creator.name_en as string)[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-3xl text-[#F5EFE0]">
                {creator.name_en as string}
              </h1>
              {creator.is_verified && (
                <span className="text-[#F4A52C]" title="Verified">✓</span>
              )}
              <LiveIndicator isLive={creator.is_live as boolean} />
            </div>
            <p
              className="font-serif text-lg text-[#A7A0B8] mt-0.5"
              dir="rtl"
              lang="ar"
            >
              {creator.name_ar as string}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm text-[#A7A0B8]">
                {country?.flag} {country?.name_en}
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

          {/* Score ring */}
          <div className="shrink-0 hidden sm:block">
            <SAHAScoreRing score={score} size={80} />
            <div className="text-center text-xs text-[#A7A0B8] mt-1 uppercase tracking-widest">
              SAHA Score
            </div>
          </div>
        </div>

        {/* Rank strip */}
        <div className="border border-[#2A263A] divide-x divide-[#2A263A] flex">
          {kuwaitRank && (
            <div className="flex-1 px-5 py-3 text-center">
              <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-1">
                Kuwait Rank
              </div>
              <RankBadge rank={kuwaitRank} scope="kuwait" countryFlag={country?.flag} />
            </div>
          )}
          {gccRank && (
            <div className="flex-1 px-5 py-3 text-center">
              <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-1">
                GCC Rank
              </div>
              <RankBadge rank={gccRank} scope="gcc" />
            </div>
          )}
          <div className="flex-1 px-5 py-3 text-center sm:hidden">
            <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-1">
              SAHA Score
            </div>
            <SAHAScoreRing score={score} size={40} strokeWidth={3} />
          </div>
        </div>

        {/* Platform stats grid */}
        <div>
          <h2 className="font-serif text-lg text-[#F5EFE0] mb-3">Platforms</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {(creator.platforms as { id: string; platform: string; followers: number; platform_username: string; is_live: boolean }[] ?? []).map((p) => {
              const platform = getPlatform(p.platform);
              return (
                <div
                  key={p.id}
                  className="border border-[#2A263A] bg-[#0F1118] p-4 text-center"
                >
                  <div
                    className="text-xs font-medium mb-2 uppercase tracking-widest"
                    style={{ color: platform?.color ?? "#A7A0B8" }}
                  >
                    {platform?.label ?? p.platform}
                    {p.is_live && (
                      <span className="ml-1 w-1.5 h-1.5 bg-[#FF3B3B] rounded-full inline-block live-pulse" />
                    )}
                  </div>
                  <div className="font-serif text-xl text-[#F5EFE0]">
                    {formatFollowers(p.followers)}
                  </div>
                  <div className="text-xs text-[#A7A0B8] mt-0.5 truncate">
                    @{p.platform_username}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Growth stats */}
        <div className="border border-[#2A263A] divide-x divide-[#2A263A] flex">
          <div className="flex-1 px-5 py-4 text-center">
            <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-1">
              This Week
            </div>
            <div
              className={`font-serif text-2xl font-medium ${
                weeklyGrowthRate >= 0 ? "text-[#3FB950]" : "text-[#FF3B3B]"
              }`}
            >
              {formatGrowth(weeklyGrowthRate)}
            </div>
          </div>
          <div className="flex-1 px-5 py-4 text-center">
            <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-1">
              This Month
            </div>
            <div
              className={`font-serif text-2xl font-medium ${
                monthlyGrowthRate >= 0 ? "text-[#3FB950]" : "text-[#FF3B3B]"
              }`}
            >
              {formatGrowth(monthlyGrowthRate)}
            </div>
          </div>
          <div className="flex-1 px-5 py-4 text-center">
            <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-1">
              Total Followers
            </div>
            <div className="font-serif text-2xl text-[#F5EFE0] font-medium">
              {formatFollowers(totalFollowers)}
            </div>
          </div>
        </div>

        {/* Growth chart */}
        {chartData.length > 1 && (
          <div className="border border-[#2A263A] bg-[#0F1118] p-5">
            <h2 className="font-serif text-sm text-[#A7A0B8] uppercase tracking-widest mb-4">
              30-Day Growth
            </h2>
            <GrowthLine data={chartData} height={160} />
          </div>
        )}

        {/* External links */}
        <div className="flex flex-wrap gap-2">
          {(creator.platforms as { id: string; platform: string; platform_username: string }[] ?? []).map((p) => {
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
