"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PLATFORMS } from "@/lib/constants/platforms";

export type PlatformSeries = Record<
  string,
  Array<{ date: string; followers: number }>
>;

interface PlatformGrowthChartProps {
  series: PlatformSeries;
  height?: number;
}

function mergeSeries(series: PlatformSeries): Record<string, unknown>[] {
  const dateMap = new Map<string, Record<string, number>>();
  for (const [platform, data] of Object.entries(series)) {
    for (const { date, followers } of data) {
      if (!dateMap.has(date)) dateMap.set(date, {});
      dateMap.get(date)![platform] = followers;
    }
  }
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-[#2A263A] bg-[#19162A] px-3 py-2 text-xs space-y-1">
      <div className="text-[#A7A0B8] mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span className="text-[#A7A0B8]">{p.name}</span>
          <span className="text-[#F5EFE0] ml-auto pl-4 tabular-nums">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlatformGrowthChart({
  series,
  height = 200,
}: PlatformGrowthChartProps) {
  const activePlatforms = Object.keys(series).filter(
    (p) => series[p].length >= 2
  );

  if (!activePlatforms.length) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2"
        style={{ height }}
      >
        <div className="text-xs text-[#A7A0B8] uppercase tracking-widest">
          Collecting Data
        </div>
        <div className="text-xs text-[#4A4560]">
          Growth chart appears after 2+ days of tracking
        </div>
      </div>
    );
  }

  const data = mergeSeries(
    Object.fromEntries(activePlatforms.map((p) => [p, series[p]]))
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
      >
        <XAxis
          dataKey="date"
          tick={{ fill: "#4A4560", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tick={{ fill: "#4A4560", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v: number) =>
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : String(v)
          }
        />
        <Tooltip content={<ChartTooltip />} />
        {activePlatforms.map((platform) => {
          const p = PLATFORMS.find((pl) => pl.id === platform);
          return (
            <Line
              key={platform}
              type="monotone"
              dataKey={platform}
              stroke={p?.color ?? "#A7A0B8"}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              name={p?.label ?? platform}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
