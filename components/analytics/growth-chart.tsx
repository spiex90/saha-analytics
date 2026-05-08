"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface GrowthDataPoint {
  date: string;
  twitch: number;
  instagram: number;
  tiktok: number;
  youtube: number;
}

interface GrowthChartProps {
  data: GrowthDataPoint[];
}

const PLATFORM_LINES = [
  { key: "twitch", label: "Twitch", color: "#9146FF" },
  { key: "instagram", label: "Instagram", color: "#E1306C" },
  { key: "tiktok", label: "TikTok", color: "#F5EFE0" },
  { key: "youtube", label: "YouTube", color: "#FF0000" },
] as const;

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function formatYAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border border-[#2A263A] bg-[#19162A] px-3 py-2.5 text-xs space-y-1 min-w-[140px]">
      <div className="text-[#A7A0B8] mb-1.5">
        {label ? formatAxisDate(label) : ""}
      </div>
      {payload.map((entry) => {
        const platform = PLATFORM_LINES.find((p) => p.key === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }} className="font-medium">
              {platform?.label ?? entry.dataKey}
            </span>
            <span className="text-[#F5EFE0]">{formatYAxis(entry.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-[#F5EFE0]">30-Day Growth</h2>
          <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
            النمو خلال ٣٠ يومًا
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {PLATFORM_LINES.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-[#A7A0B8]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: "#A7A0B8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisDate}
            interval={4}
          />
          <YAxis
            tick={{ fill: "#A7A0B8", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />
          {PLATFORM_LINES.map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
