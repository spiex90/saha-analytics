import Link from "next/link";
import Image from "next/image";
import { formatFollowers, formatScore } from "@/lib/utils/format";
import { getCountry } from "@/lib/constants/countries";
import { getPlatform } from "@/lib/constants/platforms";
import { LiveIndicator } from "@/components/creator/live-indicator";
import type { CreatorWithStats } from "@/lib/types";

interface DiscoverTableProps {
  creators: CreatorWithStats[];
}

export function DiscoverTable({ creators }: DiscoverTableProps) {
  if (!creators.length) {
    return (
      <div className="border border-[#2A263A] bg-[#0F1118] py-16 text-center text-[#A7A0B8] text-sm">
        No creators found. Try adjusting filters.
      </div>
    );
  }

  return (
    <div className="border border-[#2A263A] overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#2A263A]">
            <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium w-12">
              #
            </th>
            <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
              Creator
            </th>
            <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium hidden sm:table-cell">
              Country
            </th>
            <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium hidden md:table-cell">
              Platforms
            </th>
            <th className="text-right px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
              Followers
            </th>
            <th className="text-right px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {creators.map((creator, idx) => {
            const country = getCountry(creator.country_code);
            const score = creator.score?.final_score ?? 0;

            return (
              <tr
                key={creator.id}
                className="border-b border-[#2A263A] last:border-0 hover:bg-[#0F1118] transition-colors"
              >
                {/* Rank */}
                <td className="px-4 py-3 text-[#A7A0B8] text-sm font-medium tabular-nums w-12">
                  {idx + 1}
                </td>

                {/* Creator */}
                <td className="px-4 py-3">
                  <Link
                    href={`/creator/${creator.handle}`}
                    className="flex items-center gap-3 group"
                  >
                    {creator.avatar_url ? (
                      <Image
                        src={creator.avatar_url}
                        alt={creator.name_en}
                        width={32}
                        height={32}
                        className="object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-[#19162A] flex items-center justify-center text-[#A7A0B8] text-sm font-serif shrink-0">
                        {creator.name_en[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#F5EFE0] group-hover:text-[#F4A52C] transition-colors truncate">
                          {creator.name_en}
                        </span>
                        {creator.is_verified && (
                          <span className="text-[#F4A52C] text-xs shrink-0">✓</span>
                        )}
                        <LiveIndicator isLive={creator.is_live} />
                      </div>
                      <div
                        className="text-xs text-[#A7A0B8] truncate"
                        dir="rtl"
                        lang="ar"
                      >
                        {creator.name_ar}
                      </div>
                    </div>
                  </Link>
                </td>

                {/* Country */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="text-sm text-[#A7A0B8]">
                    {country?.flag} {country?.name_en}
                  </span>
                </td>

                {/* Platforms */}
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(creator.platforms ?? []).map((p) => {
                      const platform = getPlatform(p.platform);
                      return (
                        <span
                          key={p.id}
                          className="text-xs text-[#A7A0B8] border border-[#2A263A] px-1.5 py-0.5"
                          title={`${formatFollowers(p.followers)}`}
                        >
                          {platform?.label ?? p.platform}
                        </span>
                      );
                    })}
                  </div>
                </td>

                {/* Followers */}
                <td className="px-4 py-3 text-right text-sm text-[#F5EFE0] tabular-nums">
                  {formatFollowers(creator.total_followers)}
                </td>

                {/* SAHA Score */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      score >= 70
                        ? "text-[#F4A52C]"
                        : score >= 40
                        ? "text-[#F5EFE0]"
                        : "text-[#A7A0B8]"
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
