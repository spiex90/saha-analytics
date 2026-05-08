"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface GrowthDataPoint {
  date: string;
  twitch?: number;
  instagram?: number;
  tiktok?: number;
  youtube?: number;
  kick?: number;
  [key: string]: string | number | undefined;
}

interface GrowthChartProps {
  data: GrowthDataPoint[];
}

const PLATFORM_LINES = [
  { key: "twitch",    label: "TWITCH",    color: "#7B5EA7" },
  { key: "instagram", label: "INSTAGRAM", color: "#A0325A" },
  { key: "tiktok",    label: "TIKTOK",    color: "#8A8070" },
  { key: "youtube",   label: "YOUTUBE",   color: "#A03030" },
] as const;

const RANGE_OPTIONS = [
  { value: "30d", label: "آخر 30 يوم" },
  { value: "7d", label: "آخر 7 أيام" },
  { value: "90d", label: "آخر 90 يوم" },
];

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
    <div className="border border-[#2A263A] bg-[#0F1118] px-3 py-2 text-xs space-y-1 min-w-[160px]">
      <div className="text-[9px] font-mono tracking-widest text-[#4A4560] mb-1.5 border-b border-[#2A263A] pb-1.5">
        {label ? formatAxisDate(label).toUpperCase() : ""}
      </div>
      {payload.map((entry) => {
        const platform = PLATFORM_LINES.find((p) => p.key === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }} className="text-[9px] font-mono tracking-widest">
              {platform?.label ?? entry.dataKey}
            </span>
            <span className="text-[10px] font-mono text-[#F5EFE0] tabular-nums">{formatYAxis(entry.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GrowthChart({ data }: GrowthChartProps) {
  const [range, setRange] = useState("30d");

  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-[#2A263A]">
        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#A7A0B8]">
            Follower Index
          </h2>
          <p className="text-[10px] font-mono text-[#4A4560] mt-0.5" dir="rtl">
            مؤشر المتابعين · 30D
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Platform legend */}
          <div className="flex items-center gap-3">
            {PLATFORM_LINES.map(({ key, label, color }) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-4 shrink-0"
                  style={{ height: 1, backgroundColor: color, opacity: 0.85 }}
                />
                <span className="text-[9px] font-mono tracking-widest text-[#4A4560]">{label}</span>
              </div>
            ))}
          </div>

          {/* Range dropdown */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-[10px] font-mono bg-[#0B0A12] border border-[#2A263A] text-[#A7A0B8] px-2 py-1 rounded-none focus:outline-none focus:border-[#F4A52C] cursor-pointer tracking-widest"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#0B0A12]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart or Collecting state */}
      {data.length < 2 ? (
        <div className="flex flex-col items-center justify-center gap-2" style={{ height: 280 }}>
          <div className="text-xs text-[#A7A0B8] uppercase tracking-widest">Collecting Data</div>
          <div className="text-xs text-[#4A4560]">Growth chart appears after 2+ days of tracking</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid
              horizontal={true}
              vertical={false}
              stroke="#2A263A"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#4A4560", fontSize: 9, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisDate}
              interval={4}
            />
            <YAxis
              tick={{ fill: "#4A4560", fontSize: 9, fontFamily: "monospace" }}
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
                strokeWidth={1}
                strokeOpacity={0.85}
                dot={false}
                activeDot={{ r: 2.5, fill: color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
