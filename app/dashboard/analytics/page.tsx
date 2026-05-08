import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatFollowers } from "@/lib/utils/format";
import { getCountry } from "@/lib/constants/countries";
import { HeaderAnalytics } from "@/components/analytics/header-analytics";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { GrowthChart } from "@/components/analytics/growth-chart";
import { PlatformPerformance } from "@/components/analytics/platform-performance";
import { RankingMovement } from "@/components/analytics/ranking-movement";
import { CompareCreator } from "@/components/analytics/compare-creator";
import { ShareBadges } from "@/components/analytics/share-badges";
import { DetailedInsights } from "@/components/analytics/detailed-insights";
import { TopCreatorsTable } from "@/components/analytics/top-creators-table";
import type { CreatorWithStats } from "@/lib/types";

// ─────────────────────────────────────────────────
// MOCK ANALYTICS DATA
// TODO: Replace with Supabase queries when analytics
//       tables have sufficient historical data (30+ days)
// ─────────────────────────────────────────────────
const mockAnalyticsData = {
  growth30dPct: 18.7, // TODO: creator_growth.growth_pct WHERE period='30d'
  growthWeeklyPct: 4.3, // TODO: creator_growth.growth_pct WHERE period='7d'
  momentumScore: 92, // TODO: compute from growth velocity
  rankMovement: 2, // TODO: compare rankings.rank vs yesterday's snapshot

  kpiSparklines: {
    followers: [4.1, 4.15, 4.2, 4.22, 4.28, 4.31, 4.35, 4.38, 4.41, 4.44, 4.45, 4.46],
    growth30d: [12, 13, 14, 15, 16, 15, 17, 17, 18, 18, 19, 18.7],
    growthWeekly: [2.1, 2.5, 3.0, 3.2, 3.8, 4.0, 4.1, 4.3, 3.9, 4.2, 4.3, 4.3],
    momentum: [80, 82, 83, 85, 86, 87, 88, 89, 90, 91, 91, 92],
    rankMovement: [0, -1, 0, 1, 0, 0, 1, 1, 2, 2, 2, 2],
  },

  // 30-day chart — deterministic (no Math.random)
  // TODO: Replace with creator_snapshots data grouped by platform+day
  chartData: Array.from({ length: 30 }, (_, i) => ({
    date: (() => {
      const d = new Date("2026-04-09");
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    })(),
    twitch: Math.round(1700 + i * 8 + Math.sin(i * 0.8) * 40),
    instagram: Math.round(1150 + i * 5 + Math.sin(i * 0.6) * 25),
    tiktok: Math.round(155 + i * 1.5 + Math.cos(i * 0.9) * 10),
    youtube: Math.round(168 + i * 1.0 + Math.cos(i * 0.5) * 7),
  })),

  // TODO: Replace with creator_growth data per platform once platform-level growth is tracked
  platformPerformance: [
    { id: "twitch", growth: 22.4, sparkData: [18, 19, 20, 20, 21, 21, 22, 22, 23, 22, 23, 22.4] },
    { id: "instagram", growth: 18.1, sparkData: [14, 15, 15, 16, 16, 17, 17, 17, 18, 18, 18, 18.1] },
    { id: "tiktok", growth: 16.7, sparkData: [11, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 16.7] },
    { id: "youtube", growth: 13.9, sparkData: [9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 13.9] },
  ],

  rankChange: 2, // TODO: historical_rankings diff
  genreRank: 3, // TODO: rankings WHERE scope='genre_Gaming'
  percentile: 82, // TODO: compute percentile from all creator_scores

  insights: [
    { label: "Avg. Views", labelAr: "متوسط المشاهدات", value: "+12.6K", delta: "+5.4%", sparkData: [8, 9, 9, 10, 10, 11, 11, 12, 12, 12, 13, 12.6] },
    { label: "Engagement Rate", labelAr: "معدل التفاعل", value: "6.8%", delta: "+1.3%", sparkData: [5, 5.5, 5.8, 6, 6.1, 6.3, 6.5, 6.5, 6.7, 6.7, 6.8, 6.8] },
    { label: "Avg. Watch Time", labelAr: "متوسط وقت المشاهدة", value: "2h 14m", delta: "+8.7%", sparkData: [90, 95, 100, 105, 108, 112, 115, 118, 120, 125, 130, 134] },
    { label: "Chat Activity", labelAr: "نشاط الدردشة", value: "18.3K", delta: "+15.1%", sparkData: [12, 13, 13, 14, 14, 15, 15, 16, 17, 17, 18, 18.3] },
    { label: "Unique Viewers", labelAr: "المشاهدون الفريدون", value: "312K", delta: "+9.2%", sparkData: [240, 250, 255, 265, 270, 275, 280, 285, 290, 300, 308, 312] },
  ],

  // TODO: Replace with real creator data from public.creators + their SAHA scores
  topCreators: [
    { rank: 1, handle: "q8gamer", nameEn: "Q8 Gamer", score: 92, growth: 24.8, isSelf: false },
    { rank: 2, handle: "khaleejstream", nameEn: "Khaleej Stream", score: 90, growth: 20.1, isSelf: false },
    { rank: 3, handle: "spiex", nameEn: "Spiex", score: 89, growth: 18.7, isSelf: true },
    { rank: 4, handle: "legendq8", nameEn: "Legend Q8", score: 87, growth: 15.2, isSelf: false },
    { rank: 5, handle: "kuwaitfps", nameEn: "Kuwait FPS", score: 85, growth: 13.0, isSelf: false },
  ],
};

// Inline hero card — uses lots of local data so kept in page
interface HeroCardProps {
  creator: CreatorWithStats;
  kuwaitRank: number | null;
  gccRank: number | null;
  growth30dPct: number;
}

function ScoreColor(score: number): string {
  if (score >= 70) return "#F4A52C";
  if (score >= 50) return "#3FB950";
  return "#A7A0B8";
}

function AnalyticsHeroCard({ creator, kuwaitRank, gccRank, growth30dPct }: HeroCardProps) {
  const score = creator.score?.final_score ?? 0;
  const country = getCountry(creator.country_code);
  const totalFollowers = creator.platforms?.reduce((s, p) => s + (p.followers ?? 0), 0) ?? 0;

  const ringSize = 120;
  const strokeWidth = 7;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const ringColor = ScoreColor(score);

  const scoreLabel = score >= 70 ? "EXCELLENT" : score >= 50 ? "GOOD" : "BUILDING";

  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Left: Creator info */}
        <div className="flex flex-col items-center sm:items-start gap-2 min-w-[160px]">
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.name_en}
              width={72}
              height={72}
              className="w-18 h-18 rounded-full object-cover border border-[#2A263A]"
              style={{ width: 72, height: 72 }}
            />
          ) : (
            <div
              className="rounded-full bg-[#19162A] border border-[#2A263A] flex items-center justify-center"
              style={{ width: 72, height: 72 }}
            >
              <span className="font-serif text-[#F4A52C] text-xl">
                {creator.handle.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {creator.name_ar && (
            <p className="font-serif text-[#F5EFE0] text-lg" dir="rtl">
              {creator.name_ar}
            </p>
          )}
          <p className="text-sm text-[#A7A0B8]">@{creator.handle}</p>
          {country && (
            <p className="text-sm text-[#A7A0B8]">
              {country.flag} {country.name_en}
            </p>
          )}

          <p className="text-xs text-[#A7A0B8]">
            Synced {creator.updated_at
              ? (() => {
                  const diff = Math.floor((Date.now() - new Date(creator.updated_at).getTime()) / 60000);
                  return diff < 60 ? `${diff}m ago` : `${Math.floor(diff / 60)}h ago`;
                })()
              : "—"}
          </p>

          <p className="text-xs text-[#A7A0B8]">
            {formatFollowers(totalFollowers)} total followers
          </p>

          <a
            href={`/creator/${creator.handle}`}
            className="mt-1 h-8 px-3 text-xs border border-[#F4A52C] text-[#F4A52C] hover:bg-[#F4A52C] hover:text-[#0B0A12] transition-colors inline-flex items-center"
            dir="rtl"
          >
            عرض الملف الشخصي
          </a>
        </div>

        {/* Center: Score ring */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="relative inline-flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
            <svg
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
              fill="none"
              aria-label={`SAHA Score: ${Math.round(score)}`}
            >
              <circle cx={cx} cy={cy} r={radius} stroke="#2A263A" strokeWidth={strokeWidth} />
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-serif text-[#F5EFE0] text-3xl font-medium leading-none">
                {Math.round(score)}
              </span>
            </div>
          </div>

          <p className="text-xs uppercase tracking-widest text-[#A7A0B8]">SAHA SCORE</p>
          <p className="text-sm font-medium" style={{ color: ringColor }}>
            {scoreLabel}
          </p>
          <p className="text-xs text-[#3FB950]" dir="rtl">
            ↑ 7 هذا الأسبوع
          </p>
        </div>

        {/* Right: Rank boxes */}
        <div className="flex flex-col gap-3 min-w-[140px]">
          <div className="border border-[#2A263A] bg-[#19162A] p-4 text-center">
            <p className="font-serif text-3xl text-[#F4A52C] leading-none">
              #{kuwaitRank ?? "—"}
            </p>
            <p className="text-xs text-[#F5EFE0] mt-1">في الكويت</p>
            <p className="text-[10px] text-[#A7A0B8] mt-0.5">Kuwait Rank</p>
          </div>
          <div className="border border-[#2A263A] bg-[#19162A] p-4 text-center">
            <p className="font-serif text-3xl text-[#F4A52C] leading-none">
              #{gccRank ?? "—"}
            </p>
            <p className="text-xs text-[#F5EFE0] mt-1">في الخليج</p>
            <p className="text-[10px] text-[#A7A0B8] mt-0.5">GCC Rank</p>
          </div>
          <div className="border border-[#2A263A] bg-[#19162A] p-4 text-center">
            <p className="font-serif text-3xl text-[#3FB950] leading-none">
              +{growth30dPct}%
            </p>
            <p className="text-xs text-[#F5EFE0] mt-1">نمو ٣٠ يومًا</p>
            <p className="text-[10px] text-[#A7A0B8] mt-0.5">30-Day Growth</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // Auth check — middleware also guards this, but belt-and-suspenders
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Real Supabase data ──────────────────────────────────────
  // Fetch creator = spiex90 (hardcoded for POC — TODO: link via users table)
  const { data: creatorRaw } = await supabase
    .from("creators")
    .select("*, platforms:creator_platforms(*), score:creator_scores(*)")
    .eq("handle", "spiex90")
    .maybeSingle();

  // Rankings for the creator
  const { data: rankings } = creatorRaw
    ? await supabase
        .from("rankings")
        .select("scope,rank,score")
        .eq("creator_id", creatorRaw.id)
    : { data: [] };

  // Growth records
  const { data: growthRows } = creatorRaw
    ? await supabase
        .from("creator_growth")
        .select("*")
        .eq("creator_id", creatorRaw.id)
    : { data: [] };

  // Resolve creator with fallback
  const creator = (creatorRaw as unknown as CreatorWithStats) ?? {
    id: "fallback",
    handle: "spiex90",
    name_en: "Spiex",
    name_ar: "سبيكس",
    bio_en: null,
    bio_ar: null,
    avatar_url: null,
    country_code: "KW",
    genres: ["Gaming"],
    is_verified: true,
    is_featured: false,
    is_live: false,
    approval_status: "approved" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    platforms: [],
    score: null,
    kuwait_rank: null,
    gcc_rank: null,
    total_followers: 0,
  };

  // Derive ranks from the rankings rows
  const kuwaitRanking = (rankings ?? []).find(
    (r: { scope: string; rank: number }) => r.scope === "country_KW"
  );
  const gccRanking = (rankings ?? []).find(
    (r: { scope: string; rank: number }) => r.scope === "gcc"
  );
  const kuwaitRank = kuwaitRanking?.rank ?? null;
  const gccRank = gccRanking?.rank ?? null;

  // Build total followers from platforms
  const totalFollowersRaw =
    (creator.platforms ?? []).reduce(
      (s: number, p: { followers?: number }) => s + (p.followers ?? 0),
      0
    ) ?? 0;

  // KPI data for cards
  const kpiData = {
    totalFollowers: {
      value: formatFollowers(totalFollowersRaw || 446000),
      trend: "up" as const,
      sparkData: mockAnalyticsData.kpiSparklines.followers,
    },
    growth30d: {
      value: `+${mockAnalyticsData.growth30dPct}%`,
      trend: "up" as const,
      sparkData: mockAnalyticsData.kpiSparklines.growth30d,
    },
    growthWeekly: {
      value: `+${mockAnalyticsData.growthWeeklyPct}%`,
      trend: "up" as const,
      sparkData: mockAnalyticsData.kpiSparklines.growthWeekly,
    },
    momentumScore: {
      value: String(mockAnalyticsData.momentumScore),
      sparkData: mockAnalyticsData.kpiSparklines.momentum,
    },
    rankMovement: {
      value: `+${mockAnalyticsData.rankMovement}`,
      trend: "up" as const,
      sparkData: mockAnalyticsData.kpiSparklines.rankMovement,
    },
  };

  // Suppress unused variable warning — growthRows reserved for future use
  void growthRows;

  return (
    <div className="min-h-screen bg-[#0B0A12]">
      <HeaderAnalytics />

      <main className="max-w-[1240px] mx-auto px-6 py-6 space-y-4">
        {/* Hero row */}
        <AnalyticsHeroCard
          creator={creator}
          kuwaitRank={kuwaitRank}
          gccRank={gccRank}
          growth30dPct={mockAnalyticsData.growth30dPct}
        />

        {/* KPIs */}
        <div className="flex gap-3">
          <KpiCards data={kpiData} />
        </div>

        {/* Chart row: 3:2 split */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <GrowthChart data={mockAnalyticsData.chartData} />
          </div>
          <div className="col-span-2">
            <PlatformPerformance platforms={mockAnalyticsData.platformPerformance} />
          </div>
        </div>

        {/* Ranking + Compare: 1:1 */}
        <div className="grid grid-cols-2 gap-4">
          <RankingMovement
            rankChange={mockAnalyticsData.rankChange}
            genreRank={mockAnalyticsData.genreRank}
            genreLabel="Gaming"
            percentile={mockAnalyticsData.percentile}
          />
          <CompareCreator
            currentHandle={creator.handle}
            currentAvatarUrl={creator.avatar_url}
          />
        </div>

        {/* Badges + Export: full width 2-col internal */}
        <ShareBadges
          creator={{
            handle: creator.handle,
            nameEn: creator.name_en,
            countryCode: creator.country_code,
          }}
        />

        {/* Insights + Leaderboard: 1:1 */}
        <div className="grid grid-cols-2 gap-4">
          <DetailedInsights insights={mockAnalyticsData.insights} />
          <TopCreatorsTable
            creators={mockAnalyticsData.topCreators}
            currentHandle={creator.handle}
          />
        </div>
      </main>

      <footer className="border-t border-[#2A263A] mt-8 py-6 text-center">
        <p className="text-xs text-[#A7A0B8]">
          SAHA Analytics — Arab Creator Intelligence &nbsp;·&nbsp;
          <span dir="rtl">ذكاء المنشئين العرب</span>
        </p>
      </footer>
    </div>
  );
}
