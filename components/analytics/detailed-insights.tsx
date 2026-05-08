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
          رؤى تفصيلية
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-3 py-2 text-[10px] uppercase tracking-widest text-[#A7A0B8] border-b border-[#2A263A]">
        <span>Metric</span>
        <span className="text-right">Value</span>
        <span className="text-right">Delta</span>
        <span className="text-right">Trend</span>
      </div>

      {/* Rows */}
      <div className="space-y-0">
        {insights.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-3 py-3 border-b border-[#2A263A]/50 hover:bg-[#19162A] transition-colors"
          >
            {/* Label */}
            <div>
              <p className="text-xs text-[#F5EFE0]">{row.label}</p>
              <p className="text-[10px] text-[#4A4560] mt-0.5" dir="rtl">
                {row.labelAr}
              </p>
            </div>

            {/* Value */}
            <div className="text-right">
              <p className="text-sm font-medium text-[#F5EFE0]">{row.value}</p>
            </div>

            {/* Delta */}
            <div className="text-right">
              <p className="text-xs text-[#3FB950]">{row.delta}</p>
            </div>

            {/* Sparkline */}
            <div className="flex justify-end">
              <Sparkline data={row.sparkData} color="#3FB950" width={60} height={24} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
