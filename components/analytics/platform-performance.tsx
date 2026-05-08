import { getPlatform } from "@/lib/constants/platforms";
import { Sparkline } from "./sparkline";

interface PlatformEntry {
  id: string;
  growth: number;
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

export function PlatformPerformance({ platforms }: PlatformPerformanceProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-[#F5EFE0]">
          Platform Performance
        </h2>
        <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
          أداء المنصات
        </p>
      </div>

      {/* Platform cards */}
      <div className="flex flex-col gap-2 flex-1">
        {platforms.map((platform) => {
          const meta = getPlatform(platform.id);
          const nameAr = PLATFORM_AR[platform.id] ?? platform.id;

          return (
            <div
              key={platform.id}
              className="border border-[#2A263A] bg-[#0F1118] px-4 py-3 flex items-center gap-3"
            >
              {/* Color dot */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: meta?.color ?? "#A7A0B8" }}
              />

              {/* Platform names */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[#F5EFE0]">
                  {meta?.label ?? platform.id}
                </span>
                <span className="text-xs text-[#A7A0B8] ml-1.5" dir="rtl">
                  {nameAr}
                </span>
              </div>

              {/* Growth % */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-[#3FB950] font-medium">
                  ↑ {platform.growth.toFixed(1)}%
                </span>
                <Sparkline
                  data={platform.sparkData}
                  color="#3FB950"
                  width={56}
                  height={24}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
