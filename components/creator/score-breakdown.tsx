import { SAHAScoreRing } from "./saha-score-ring";

interface ScoreBreakdownProps {
  finalScore: number;
  audienceScore: number;
  growthScore: number;
  activityScore: number;
  diversityScore: number;
}

const METRICS = [
  {
    label: "Audience Strength",
    key: "audienceScore" as const,
    weight: "40%",
    description: "Total cross-platform reach",
  },
  {
    label: "Growth Momentum",
    key: "growthScore" as const,
    weight: "30%",
    description: "30-day follower growth rate",
  },
  {
    label: "Consistency",
    key: "activityScore" as const,
    weight: "20%",
    description: "How regularly data is captured",
  },
  {
    label: "Platform Reach",
    key: "diversityScore" as const,
    weight: "10%",
    description: "Active platforms",
  },
];

export function ScoreBreakdown({
  finalScore,
  audienceScore,
  growthScore,
  activityScore,
  diversityScore,
}: ScoreBreakdownProps) {
  const scores: Record<string, number> = {
    audienceScore,
    growthScore,
    activityScore,
    diversityScore,
  };

  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <SAHAScoreRing score={finalScore} size={56} strokeWidth={3} />
        <div>
          <div className="text-xs text-[#A7A0B8] uppercase tracking-widest">
            SAHA Score
          </div>
          <div className="font-serif text-3xl text-[#F5EFE0] leading-none mt-1">
            {finalScore.toFixed(1)}
          </div>
          <div className="text-xs text-[#4A4560] mt-0.5">
            Composite creator intelligence index
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="space-y-3">
        {METRICS.map(({ label, key, weight }) => {
          const value = scores[key] ?? 0;
          const color =
            value >= 70
              ? "#3FB950"
              : value >= 40
              ? "#F4A52C"
              : "#A7A0B8";

          return (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs text-[#F5EFE0]">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#4A4560]">{weight}</span>
                  <span
                    className="text-sm font-medium tabular-nums w-10 text-right"
                    style={{ color }}
                  >
                    {value.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="h-[3px] bg-[#2A263A]">
                <div
                  className="h-[3px] transition-all duration-500"
                  style={{ width: `${value}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
