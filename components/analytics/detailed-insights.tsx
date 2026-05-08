import { Sparkline } from "./sparkline";

interface InsightRow {
  label: string;
  labelAr: string;
  value: string;
  delta: string;
  sparkData: number[];
}

interface DetailedInsightsProps {
  insights: InsightRow[];
}

export function DetailedInsights({ insights }: DetailedInsightsProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-[#F5EFE0]">Detailed Insights</h2>
        <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
          تحليلات مفصّلة
        </p>
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 text-[10px] uppercase tracking-widest text-[#A7A0B8]">
          <span>Metric</span>
          <span className="text-right">Value</span>
          <span className="text-right hidden sm:block">Arabic</span>
          <span className="text-right">Trend</span>
        </div>

        {insights.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-3 py-3 border border-transparent hover:border-[#2A263A] hover:bg-[#19162A] transition-colors"
          >
            {/* Label */}
            <div>
              <p className="text-sm text-[#F5EFE0]">{row.label}</p>
            </div>

            {/* Value + delta */}
            <div className="text-right">
              <p className="text-sm font-medium text-[#F5EFE0]">{row.value}</p>
              <p className="text-xs text-[#3FB950]">{row.delta}</p>
            </div>

            {/* Arabic label */}
            <div className="text-right hidden sm:block" dir="rtl">
              <p className="text-xs text-[#A7A0B8]">{row.labelAr}</p>
            </div>

            {/* Sparkline */}
            <div className="flex justify-end">
              <Sparkline data={row.sparkData} color="#3FB950" width={56} height={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
