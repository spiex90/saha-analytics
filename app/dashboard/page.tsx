import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { StatCard } from "@/components/shared/stat-card";
import { formatFollowers, formatScore } from "@/lib/utils/format";
import { getCountry } from "@/lib/constants/countries";
import { getPlatform } from "@/lib/constants/platforms";
import { Users, Radio, Trophy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { CreatorWithStats } from "@/lib/types";

async function getDashboardData() {
  const supabase = await createClient();

  const [
    { count: totalCreators },
    { count: liveNow },
    { data: kuwaitTop },
    { data: gccTop },
  ] = await Promise.all([
    supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .eq("approval_status", "approved"),
    supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .eq("is_live", true),
    supabase
      .from("rankings")
      .select(
        `rank, creator:creators!inner(*, platforms:creator_platforms(*), score:creator_scores(*))`
      )
      .eq("scope", "kuwait")
      .order("rank", { ascending: true })
      .limit(10),
    supabase
      .from("rankings")
      .select(
        `rank, creator:creators!inner(*, platforms:creator_platforms(*), score:creator_scores(*))`
      )
      .eq("scope", "gcc")
      .order("rank", { ascending: true })
      .limit(10),
  ]);

  return {
    totalCreators: totalCreators ?? 0,
    liveNow: liveNow ?? 0,
    kuwaitTop: (kuwaitTop ?? []) as unknown as { rank: number; creator: CreatorWithStats }[],
    gccTop: (gccTop ?? []) as unknown as { rank: number; creator: CreatorWithStats }[],
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as string) ?? "creator";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />

      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* Top bar */}
        <div className="h-14 border-b border-[#2A263A] px-6 flex items-center justify-between">
          <h1 className="font-serif text-lg text-[#F5EFE0]">Dashboard</h1>
          <span className="text-xs text-[#A7A0B8]">{user.email}</span>
        </div>

        <div className="px-6 py-6 space-y-8">
          <Suspense fallback={<KPISkeleton />}>
            <KPISection />
          </Suspense>

          <Suspense fallback={<TablesSkeleton />}>
            <RankingTables />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function KPISection() {
  const { totalCreators, liveNow, kuwaitTop, gccTop } =
    await getDashboardData();

  const kuwaitNo1 = kuwaitTop[0]?.creator?.name_en ?? "—";
  const gccNo1 = gccTop[0]?.creator?.name_en ?? "—";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Total Creators" value={totalCreators} icon={Users} />
      <StatCard
        label="Live Now"
        value={liveNow}
        icon={Radio}
        className={liveNow > 0 ? "border-[#FF3B3B]/30" : ""}
      />
      <StatCard label="Kuwait #1" value={kuwaitNo1} icon={Trophy} />
      <StatCard label="GCC #1" value={gccNo1} icon={Trophy} />
    </div>
  );
}

async function RankingTables() {
  const { kuwaitTop, gccTop } = await getDashboardData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <RankTable title="🇰🇼 Kuwait Top 10" rows={kuwaitTop} />
      <RankTable title="🌍 GCC Top 10" rows={gccTop} />
    </div>
  );
}

function RankTable({
  title,
  rows,
}: {
  title: string;
  rows: { rank: number; creator: CreatorWithStats }[];
}) {
  return (
    <div className="border border-[#2A263A]">
      <div className="px-4 py-3 border-b border-[#2A263A]">
        <h2 className="font-serif text-sm text-[#F5EFE0]">{title}</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2A263A]">
            <th className="text-left px-3 py-2 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium w-8">
              #
            </th>
            <th className="text-left px-3 py-2 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
              Creator
            </th>
            <th className="text-right px-3 py-2 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
              Followers
            </th>
            <th className="text-right px-3 py-2 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-8 text-center text-[#A7A0B8] text-xs"
              >
                No data yet
              </td>
            </tr>
          )}
          {rows.map(({ rank, creator }) => {
            const country = getCountry(creator.country_code);
            const totalFollowers = (creator.platforms ?? []).reduce(
              (sum, p) => sum + (p.followers ?? 0),
              0
            );
            const score = creator.score?.final_score ?? 0;

            return (
              <tr
                key={creator.id}
                className="border-b border-[#2A263A] last:border-0 hover:bg-[#0F1118] transition-colors"
              >
                <td className="px-3 py-2.5 text-xs text-[#A7A0B8] tabular-nums">
                  {rank}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/creator/${creator.handle}`}
                    className="flex items-center gap-2 group"
                  >
                    {creator.avatar_url ? (
                      <Image
                        src={creator.avatar_url}
                        alt={creator.name_en}
                        width={24}
                        height={24}
                        className="object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-[#19162A] flex items-center justify-center text-[#A7A0B8] text-xs font-serif shrink-0">
                        {creator.name_en[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-[#F5EFE0] group-hover:text-[#F4A52C] transition-colors truncate">
                      {country?.flag} {creator.name_en}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-[#A7A0B8] tabular-nums">
                  {formatFollowers(totalFollowers)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      score >= 70 ? "text-[#F4A52C]" : "text-[#A7A0B8]"
                    }`}
                  >
                    {formatScore(score)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 border border-[#2A263A] bg-[#0F1118] animate-pulse"
        />
      ))}
    </div>
  );
}

function TablesSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="border border-[#2A263A] bg-[#0F1118] h-64 animate-pulse"
        />
      ))}
    </div>
  );
}
