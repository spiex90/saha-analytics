"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  date: string;
  value: number;
}

interface GrowthLineProps {
  data: DataPoint[];
  color?: string;
  height?: number;
}

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[#2A263A] bg-[#19162A] px-3 py-2 text-xs">
      <div className="text-[#A7A0B8]">{label}</div>
      <div className="text-[#F5EFE0] font-medium mt-0.5">
        {payload[0].value.toLocaleString()}
      </div>
    </div>
  );
}

export function GrowthLine({
  data,
  color = "#F4A52C",
  height = 120,
}: GrowthLineProps) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-[#A7A0B8] text-xs border border-[#2A263A]"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <XAxis
          dataKey="date"
          tick={{ fill: "#A7A0B8", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#A7A0B8", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : String(v)
          }
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
