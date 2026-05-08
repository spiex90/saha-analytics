import Link from "next/link";
import Image from "next/image";
import { formatFollowers } from "@/lib/utils/format";
import { getCountry } from "@/lib/constants/countries";
import { getPlatform } from "@/lib/constants/platforms";
import { SAHAScoreRing } from "./saha-score-ring";
import { RankBadge } from "./rank-badge";
import { LiveIndicator } from "./live-indicator";
import type { CreatorWithStats } from "@/lib/types";

interface CreatorCardProps {
  creator: CreatorWithStats;
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const country = getCountry(creator.country_code);
  const score = creator.score?.final_score ?? 0;

  return (
    <Link
      href={`/creator/${creator.handle}`}
      className="block border border-[#2A263A] bg-[#0F1118] hover:border-[#3D3652] transition-colors p-4"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {creator.avatar_url ? (
            <Image
              src={creator.avatar_url}
              alt={creator.name_en}
              width={48}
              height={48}
              className="object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-[#19162A] flex items-center justify-center text-[#A7A0B8] font-serif text-lg">
              {creator.name_en[0]?.toUpperCase()}
            </div>
          )}
          {creator.is_live && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF3B3B] rounded-full border-2 border-[#0F1118] live-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#F5EFE0] truncate">
              {creator.name_en}
            </span>
            {creator.is_verified && (
              <span className="text-[#F4A52C] text-xs">✓</span>
            )}
            <LiveIndicator isLive={creator.is_live} />
          </div>
          <div
            className="text-xs text-[#A7A0B8] mt-0.5"
            dir="rtl"
            lang="ar"
          >
            {creator.name_ar}
          </div>

          {/* Ranks */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {creator.kuwait_rank && (
              <RankBadge
                rank={creator.kuwait_rank}
                scope="kuwait"
                countryFlag={country?.flag}
              />
            )}
            {creator.gcc_rank && (
              <RankBadge rank={creator.gcc_rank} scope="gcc" />
            )}
          </div>

          {/* Platforms */}
          <div className="flex items-center gap-1.5 mt-2">
            {creator.platforms.map((p) => {
              const platform = getPlatform(p.platform);
              return (
                <span
                  key={p.id}
                  className="text-xs text-[#A7A0B8] border border-[#2A263A] px-1.5 py-0.5"
                  title={`${platform?.label ?? p.platform}: ${formatFollowers(p.followers)}`}
                >
                  {platform?.label ?? p.platform}
                </span>
              );
            })}
          </div>
        </div>

        {/* Score ring + followers */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <SAHAScoreRing score={score} size={52} />
          <span className="text-xs text-[#A7A0B8]">
            {formatFollowers(creator.total_followers)}
          </span>
        </div>
      </div>
    </Link>
  );
}
