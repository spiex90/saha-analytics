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

export function TopCreatorsTable({
  creators,
  currentHandle,
}: TopCreatorsTableProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-[#F5EFE0]">
            Top Creators — Kuwait
          </h2>
          <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
            أفضل المنشئين في الكويت
          </p>
        </div>
        <Link
          href="/discover?sort=rank"
          className="text-xs text-[#F4A52C] hover:underline border border-[#F4A52C]/30 px-2 py-1 hover:border-[#F4A52C] transition-colors"
        >
          View Full Leaderboard
        </Link>
      </div>

      {/* Table */}
      <div className="space-y-0.5">
        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-3 py-2 text-[10px] uppercase tracking-widest text-[#A7A0B8]">
          <span>Rank</span>
          <span>Creator</span>
          <span className="text-right">Score</span>
          <span className="text-right">30d Growth</span>
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
                  ? "grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-3 py-3 border-l-2 border-[#F4A52C] bg-[#19162A]"
                  : "grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-3 py-3 border border-transparent hover:bg-[#19162A] transition-colors"
              }
            >
              {/* Rank */}
              <span
                className={
                  isSelf
                    ? "text-sm font-medium text-[#F4A52C] w-6 text-center"
                    : "text-sm text-[#A7A0B8] w-6 text-center"
                }
              >
                {creator.rank}
              </span>

              {/* Creator */}
              <div className="min-w-0">
                <p
                  className={
                    isSelf
                      ? "text-sm font-medium text-[#F5EFE0] truncate"
                      : "text-sm text-[#F5EFE0] truncate"
                  }
                >
                  {creator.nameEn}
                  {isSelf && (
                    <span className="ml-1.5 text-[10px] text-[#F4A52C] border border-[#F4A52C]/40 px-1">
                      YOU
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-[#A7A0B8]">@{creator.handle}</p>
              </div>

              {/* Score */}
              <span
                className={
                  isSelf
                    ? "text-sm font-medium text-[#F4A52C] text-right"
                    : "text-sm text-[#F5EFE0] text-right"
                }
              >
                {creator.score}
              </span>

              {/* Growth */}
              <span className="text-sm text-[#3FB950] text-right">
                +{creator.growth.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[#A7A0B8] mt-3 px-3">
        * Mock data — TODO: replace with real creators from public.creators + creator_scores
      </p>
    </div>
  );
}
