import { getPlatform } from "@/lib/constants/platforms";
import { Sparkline } from "./sparkline";

interface PlatformEntry {
  id: string;
  followers: number;
  growth: number | null;
  sparkData: number[];
}

interface PlatformPerformanceProps {
  platforms: PlatformEntry[];
}

const PLATFORM_AR: Record<string, string> = {
  twitch: "تويتش",
  instagram: "إنستغرام",
  tiktok: "تيك توك",
  youtube: "يوتيوب",
  kick: "كيك",
};

const PLATFORM_COLORS: Record<string, string> = {
  twitch:    "#7B5EA7",
  instagram: "#A0325A",
  tiktok:    "#8A8070",
  youtube:   "#A03030",
  kick:      "#4A8A2E",
};

export function PlatformPerformance({ platforms }: PlatformPerformanceProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-[#2A263A] flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#A7A0B8]">
            Platform Index
          </h2>
          <p className="text-[10px] font-mono text-[#4A4560] mt-0.5" dir="rtl">
            أداء المنصات
          </p>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-[#4A4560]">WEIGHT · GROWTH</span>
      </div>

      {/* Platform rows */}
      <div className="flex flex-col flex-1">
        {platforms.map((platform, idx) => {
          const meta = getPlatform(platform.id);
          const nameAr = PLATFORM_AR[platform.id] ?? platform.id;
          const brandColor = PLATFORM_COLORS[platform.id] ?? (meta?.color ?? "#A7A0B8");
          const initials = (meta?.label ?? platform.id).slice(0, 3).toUpperCase();
          const totalFollowers = platforms.reduce((s, p) => s + (p.followers ?? 0), 0);
          const weight = totalFollowers > 0
            ? ((platform.followers / totalFollowers) * 100).toFixed(0)
            : "—";

          return (
            <div
              key={platform.id}
              className={`flex items-center gap-3 py-2.5 px-3 hover:bg-[#19162A] transition-colors ${idx < platforms.length - 1 ? "border-b border-[#1A1726]" : ""}`}
              style={{ borderLeft: `2px solid ${brandColor}` }}
            >
              {/* Platform ticker */}
              <div
                className="w-7 h-7 flex items-center justify-center shrink-0 text-[9px] font-mono font-bold tracking-widest"
                style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
              >
                {initials}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono tracking-widest text-[#F5EFE0] leading-none uppercase">
                  {meta?.label ?? platform.id}
                </p>
                <p className="text-[9px] font-mono text-[#4A4560] mt-0.5" dir="rtl">
                  {nameAr}
                </p>
              </div>

              {/* Followers */}
              <span className="text-[10px] font-mono text-[#A7A0B8] tabular-nums shrink-0">
                {platform.followers >= 1_000_000
                  ? `${(platform.followers / 1_000_000).toFixed(1)}M`
                  : platform.followers >= 1_000
                  ? `${(platform.followers / 1_000).toFixed(1)}K`
                  : platform.followers.toLocaleString()}
              </span>

              {/* Weight */}
              <span className="text-[9px] font-mono text-[#4A4560] tabular-nums shrink-0 w-8 text-right">
                W{weight}%
              </span>

              {/* Growth */}
              {platform.growth !== null ? (
                <span className="text-[11px] font-mono text-[#3FB950] tabular-nums shrink-0 w-14 text-right">
                  +{platform.growth.toFixed(1)}%
                </span>
              ) : (
                <span className="text-[9px] font-mono text-[#4A4560] shrink-0 w-14 text-right">
                  —
                </span>
              )}

              {/* Sparkline */}
              {platform.sparkData.length >= 2 ? (
                <Sparkline data={platform.sparkData} color="#3FB950" width={40} height={22} />
              ) : (
                <div style={{ width: 40, height: 22 }} className="shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
