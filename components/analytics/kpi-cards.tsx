import { Users, TrendingUp, Zap, BarChart2 } from "lucide-react";
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
  icon: React.ReactNode;
  sparkType?: "line" | "bar";
}

const CARDS: KpiCardDef[] = [
  {
    key: "totalFollowers",
    titleEn: "Total Followers",
    titleAr: "إجمالي المتابعين",
    icon: <Users className="w-3.5 h-3.5 text-[#6B5A8A]" />,
  },
  {
    key: "growth30d",
    titleEn: "30-Day Growth",
    titleAr: "نمو ٣٠ يومًا",
    icon: <TrendingUp className="w-3.5 h-3.5 text-[#3FB950]" />,
  },
  {
    key: "growthWeekly",
    titleEn: "Weekly Growth",
    titleAr: "النمو الأسبوعي",
    icon: <TrendingUp className="w-3.5 h-3.5 text-[#3FB950]" />,
  },
  {
    key: "momentumScore",
    titleEn: "Momentum Score",
    titleAr: "درجة الزخم",
    icon: <Zap className="w-3.5 h-3.5 text-[#F4A52C]" />,
  },
  {
    key: "rankMovement",
    titleEn: "Rank Movement",
    titleAr: "حركة الترتيب",
    icon: <BarChart2 className="w-3.5 h-3.5 text-[#6B5A8A]" />,
    sparkType: "bar",
  },
];

export function KpiCards({ data }: KpiCardsProps) {
  return (
    <>
      {CARDS.map(({ key, titleEn, titleAr, icon, sparkType }) => {
        const metric = data[key];
        const isMomentum = key === "momentumScore";
        const displayValue = isMomentum ? `${metric.value}/100` : metric.value;
        const sparkColor =
          metric.trend === "up"   ? "#3FB950" :
          metric.trend === "down" ? "#FF3B3B" :
          "#F4A52C";

        return (
          <div
            key={key}
            className="flex-1 border border-[#2A263A] bg-[#0F1118] p-4 min-w-0 border-t-[1px]"
          >
            {/* Title row */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#A7A0B8] flex items-center gap-1">
                <span className="text-[#F4A52C] leading-none">▎</span>
                {titleEn}
              </p>
              {icon}
            </div>

            {/* Value — ticker style */}
            <div className="flex items-end gap-1 mb-3">
              {metric.trend === "up"   && <span className="text-[#3FB950] text-[10px] font-mono leading-none mb-0.5">▲</span>}
              {metric.trend === "down" && <span className="text-[#FF3B3B] text-[10px] font-mono leading-none mb-0.5">▼</span>}
              <span className="font-serif text-2xl text-[#F5EFE0] leading-none tabular-nums">
                {displayValue}
              </span>
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-[#4A4560]" dir="rtl">
                {titleAr}
              </span>
              <Sparkline
                data={metric.sparkData}
                color={sparkColor}
                width={64}
                height={26}
                type={sparkType ?? "line"}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
