import { Sparkline } from "./sparkline";

interface KpiMetric {
  value: string;
  trend?: "up" | "down";
  sparkData: number[];
}

interface KpiData {
  totalFollowers: KpiMetric;
  growth30d: KpiMetric;
  growthWeekly: KpiMetric;
  momentumScore: KpiMetric;
  rankMovement: KpiMetric;
}

interface KpiCardsProps {
  data: KpiData;
}

interface KpiCardDef {
  key: keyof KpiData;
  titleEn: string;
  titleAr: string;
}

const CARDS: KpiCardDef[] = [
  { key: "totalFollowers", titleEn: "Total Followers", titleAr: "إجمالي المتابعين" },
  { key: "growth30d", titleEn: "30-Day Growth", titleAr: "نمو ٣٠ يومًا" },
  { key: "growthWeekly", titleEn: "Weekly Growth", titleAr: "النمو الأسبوعي" },
  { key: "momentumScore", titleEn: "Momentum Score", titleAr: "درجة الزخم" },
  { key: "rankMovement", titleEn: "Rank Movement", titleAr: "حركة الترتيب" },
];

function TrendArrow({ trend }: { trend?: "up" | "down" }) {
  if (!trend) return null;
  if (trend === "up") {
    return <span className="text-[#3FB950] text-lg leading-none">↑</span>;
  }
  return <span className="text-[#FF3B3B] text-lg leading-none">↓</span>;
}

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <>
      {CARDS.map(({ key, titleEn, titleAr }) => {
        const metric = data[key];
        return (
          <div
            key={key}
            className="flex-1 border border-[#2A263A] bg-[#0F1118] p-4 min-w-0"
          >
            {/* Title */}
            <p className="text-[10px] uppercase tracking-widest text-[#A7A0B8] mb-2">
              {titleEn}
            </p>

            {/* Value + trend */}
            <div className="flex items-end gap-1.5 mb-3">
              <span className="font-serif text-3xl text-[#F5EFE0] leading-none">
                {metric.value}
              </span>
              <TrendArrow trend={metric.trend} />
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A7A0B8]" dir="rtl">
                {titleAr}
              </span>
              <Sparkline
                data={metric.sparkData}
                color={
                  metric.trend === "up"
                    ? "#3FB950"
                    : metric.trend === "down"
                    ? "#FF3B3B"
                    : "#F4A52C"
                }
                width={64}
                height={28}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
