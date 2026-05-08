import Link from "next/link";

interface CreatorRow {
  rank: number;
  handle: string;
  nameEn: string;
  score: number;
  growth: number;
  isSelf: boolean;
}

interface TopCreatorsTableProps {
  creators: CreatorRow[];
  currentHandle: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#F4A52C";
  if (score >= 50) return "#3FB950";
  return "#A7A0B8";
}

export function TopCreatorsTable({
  creators,
  currentHandle,
}: TopCreatorsTableProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-[#F5EFE0]">
            Top Creators in Kuwait
          </h2>
          <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
            أفضل المنشئين في الكويت
          </p>
        </div>
        <Link
          href="/discover?sort=rank"
          className="text-xs text-[#F4A52C] hover:underline border border-[#F4A52C]/30 px-2 py-1 hover:border-[#F4A52C] transition-colors whitespace-nowrap"
        >
          View Full Leaderboard
        </Link>
      </div>

      {/* Table */}
      <div className="space-y-0">
        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-3 py-2 text-[10px] uppercase tracking-widest text-[#A7A0B8] border-b border-[#2A263A]">
          <span>Rank</span>
          <span>Creator</span>
          <span className="text-right">SAHA Score</span>
          <span className="text-right">30-Day Growth</span>
        </div>

        {/* Rows */}
        {creators.map((creator) => {
          const isSelf =
            creator.isSelf ||
            creator.handle.toLowerCase() === currentHandle.toLowerCase();

          return (
            <div
              key={creator.handle}
              className={
                isSelf
                  ? "grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-3 py-3 bg-[#F4A52C]/10 border border-[#F4A52C]/20"
                  : "grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-3 py-3 border-b border-[#2A263A]/50 hover:bg-[#19162A] transition-colors"
              }
            >
              {/* Rank */}
              <span className="text-xs text-[#A7A0B8] w-6 text-center">
                #{creator.rank}
              </span>

              {/* Creator */}
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 rounded-full bg-[#19162A] border border-[#2A263A] flex items-center justify-center shrink-0 text-[10px] font-medium text-[#A7A0B8]"
                >
                  {creator.handle.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#F5EFE0] truncate">
                    @{creator.handle}
                    {isSelf && (
                      <span className="ml-1.5 text-[10px] text-[#F4A52C] border border-[#F4A52C]/40 px-1">
                        YOU
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#4A4560] truncate">{creator.nameEn}</p>
                </div>
              </div>

              {/* Score */}
              <span
                className="text-sm font-medium text-right"
                style={{ color: scoreColor(creator.score) }}
              >
                {creator.score}
              </span>

              {/* Growth */}
              <span className="text-sm text-[#3FB950] text-right whitespace-nowrap">
                +{creator.growth.toFixed(1)}% ↑
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
