/**
 * Public Creator Profile
 *
 * Redesigned to match the SAHA analytics dashboard aesthetic.
 * Uses the same design tokens, inline-style system, and component
 * patterns as app/dashboard/analytics/page.tsx.
 */

import { notFound } from "next/navigation";
import { HeaderPublic } from "@/components/layout/header-public";
import { createClient } from "@/lib/supabase/server";
import { getCountry } from "@/lib/constants/countries";

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────
const A    = "#F4A52C";
const BRD  = "#2A263A";
const BS   = "#1f1c2e";
const TX   = "#F5EFE0";
const M    = "#A7A0B8";
const M2   = "#6f6982";
const UP   = "#6ec98c";
const DN   = "#d96a6a";
const SF   = "#0F1118";
const EL   = "#19162A";
const SERIF  = "var(--font-serif), Georgia, serif";
const MONO   = "var(--font-mono), ui-monospace, monospace";
const ARABIC = "var(--font-arabic), serif";

type Sty = React.CSSProperties;

function surf(extra: Sty = {}): Sty {
  return { background: SF, border: `1px solid ${BRD}`, borderRadius: 14, ...extra };
}

const LXS: Sty = {
  fontSize: 10.5, letterSpacing: "0.16em",
  textTransform: "uppercase", color: M, fontWeight: 500,
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function platformUrl(p: string, u: string): string {
  const map: Record<string, string> = {
    twitch:    `https://twitch.tv/${u}`,
    youtube:   `https://youtube.com/@${u}`,
    tiktok:    `https://tiktok.com/@${u}`,
    instagram: `https://instagram.com/${u}`,
    kick:      `https://kick.com/${u}`,
  };
  return map[p] ?? "#";
}

// ─────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────

function SparkSVG({
  data, width = 80, height = 22, stroke = A,
}: { data: number[]; width?: number; height?: number; stroke?: string }) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = (max - min) || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [
    +(i * stepX).toFixed(1),
    +(height - ((v - min) / span) * (height - 4) - 2).toFixed(1),
  ] as [number, number]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span style={{ color: up ? UP : DN, fontSize: 12, fontVariantNumeric: "tabular-nums", fontFamily: MONO }}>
      {up ? "↑" : "↓"} {Math.abs(value)}{suffix}
    </span>
  );
}

function VerifiedBadge() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}>
      <path d="M12 1.5l2.4 1.7 2.9-.4 1.5 2.5 2.7 1.2-.6 2.9 1.6 2.5-1.9 2.3.2 2.9-2.7 1.1-1.2 2.7-2.9-.3L12 22.5l-2-1.9-2.9.3-1.2-2.7-2.7-1.1.2-2.9L1.5 12l1.6-2.5-.6-2.9 2.7-1.2L6.7 2.8l2.9.4z"
        fill="#1a1426" stroke={A} strokeWidth="1" />
      <path d="M8 12.2l2.7 2.7L16 9.6" fill="none" stroke={A} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AvatarEl({ size = 42, label = "?", ring = false }: { size?: number; label?: string; ring?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      padding: ring ? 2 : 0,
      background: ring ? "linear-gradient(180deg, rgba(244,165,44,0.85), rgba(244,165,44,0.2))" : "transparent",
      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <div style={{
        width: ring ? size - 4 : size, height: ring ? size - 4 : size, borderRadius: "50%",
        background: "linear-gradient(135deg, #3a2a1f, #1d130c)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: SERIF, fontSize: Math.round(size * 0.42), fontWeight: 500,
        color: "rgba(245,239,224,0.55)",
      }}>
        {label}
      </div>
    </div>
  );
}

function KuwaitMapSVG() {
  return (
    <svg width={90} height={70} viewBox="0 0 100 80">
      <path d="M30 8 L62 6 L78 18 L86 28 L82 42 L74 50 L78 62 L70 70 L52 72 L40 66 L24 60 L18 50 L14 36 L20 22 Z"
        fill="rgba(244,165,44,0.10)" stroke="rgba(244,165,44,0.55)" strokeWidth="1" />
      <circle cx="48" cy="40" r="2" fill={A} />
    </svg>
  );
}

function ArabWorldSVG() {
  return (
    <svg width={110} height={70} viewBox="0 0 140 80">
      <path d="M10 30 L24 16 L46 10 L70 14 L94 8 L118 14 L132 28 L126 50 L108 60 L86 64 L74 72 L60 68 L48 70 L34 64 L22 56 L12 46 Z"
        fill="rgba(167,160,184,0.05)" stroke="rgba(167,160,184,0.32)" strokeWidth="1" />
      <circle cx="72" cy="38" r="2.2" fill={A} />
    </svg>
  );
}

function DottedMapSVG({ width = 130, height = 80 }: { width?: number; height?: number }) {
  const dots: { x: number; y: number; intense: boolean }[] = [];
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 30; col++) {
      const px = col / 30, py = row / 18;
      const inLand =
        py > 0.15 && py < 0.85 && px > 0.05 && px < 0.95 &&
        Math.sin(px * 7) + Math.cos(py * 5) > -0.7 &&
        !(px < 0.2 && py > 0.5) && !(px > 0.85 && py < 0.3);
      if (!inLand) continue;
      const intense = px > 0.4 && px < 0.7 && py > 0.35 && py < 0.6;
      dots.push({ x: col * (width / 30), y: row * (height / 18), intense });
    }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.intense ? 0.9 : 0.55}
          fill={d.intense ? A : "rgba(167,160,184,0.45)"}
          opacity={d.intense ? 0.95 : 0.5} />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number; label: string }) {
  const size = 300;
  const radius = size / 2 - 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const scoreLabel = score >= 85 ? "ELITE" : score >= 70 ? "EXCELLENT" : score >= 55 ? "STRONG" : score >= 40 ? "BUILDING" : "EMERGING";

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const r1 = radius - 8, r2 = radius - 3;
    const cx = size / 2, cy = size / 2;
    return {
      x1: cx + Math.cos(angle) * r1, y1: cy + Math.sin(angle) * r1,
      x2: cx + Math.cos(angle) * r2, y2: cy + Math.sin(angle) * r2,
      long: i % 5 === 0,
    };
  });

  const pillars = [
    { k: "Growth",  v: 88, data: [3,5,4,6,5,7,8,7,9,10] },
    { k: "Loyalty", v: 91, data: [6,5,7,6,8,7,9,8,10,9] },
    { k: "Engage",  v: 87, data: [5,6,5,7,6,8,7,9,8,10] },
    { k: "Momentum",v: 88, data: [4,5,4,6,5,7,8,9,10,11] },
    { k: "Consist.",v: 90, data: [7,6,8,7,9,8,9,8,9,10] },
  ];

  return (
    <div style={surf({ padding: 22, display: "flex", flexDirection: "column" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={LXS}>SAHA Score Index</span>
        <span style={{ fontSize: 10.5, letterSpacing: "0.18em", color: M2, fontFamily: MONO }}>OFFICIAL · CERTIFIED</span>
      </div>

      {/* Ring */}
      <div style={{ position: "relative", width: size, margin: "0 auto", height: size, flexShrink: 0 }}>
        {/* Tick marks */}
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {ticks.map((t, i) => (
            <line key={i}
              x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)}
              x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)}
              stroke={t.long ? "rgba(245,239,224,0.18)" : "rgba(245,239,224,0.07)"}
              strokeWidth={t.long ? 1.2 : 0.8} />
          ))}
        </svg>

        {/* Progress arc */}
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius - 4} fill="rgba(0,0,0,0.35)" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={5} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius}
            stroke={A} strokeWidth={14} fill="none" opacity={0.12}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
          <circle cx={size / 2} cy={size / 2} r={radius}
            stroke={A} strokeWidth={8} fill="none" opacity={0.22}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
          <circle cx={size / 2} cy={size / 2} r={radius}
            stroke={A} strokeWidth={5} fill="none"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ filter: "drop-shadow(0 0 8px rgba(244,165,44,0.85)) drop-shadow(0 0 20px rgba(244,165,44,0.4))" }} />
        </svg>

        {/* Center text */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <span style={{ fontSize: 10.5, letterSpacing: "0.28em", color: M, fontFamily: MONO }}>SAHA SCORE</span>
          <span style={{ fontFamily: SERIF, fontSize: 82, lineHeight: 0.95, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX }}>
            {score}
          </span>
          <span style={{ fontSize: 12.5, letterSpacing: "0.32em", color: A, marginTop: 8, fontFamily: MONO }}>{scoreLabel}</span>
          <span style={{ fontSize: 12, color: M, marginTop: 6, fontFamily: MONO }}>{label}</span>
        </div>
      </div>

      {/* Sub-pillars */}
      <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${BS}`, marginTop: 18 }}>
        {pillars.map((p, idx) => (
          <div key={p.k} style={{
            flex: 1, padding: "14px 0 16px", textAlign: "center",
            borderRight: idx < pillars.length - 1 ? `1px solid ${BS}` : "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: M, letterSpacing: "0.04em" }}>{p.k}</span>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 12, height: 12, borderRadius: "50%", border: `1px solid ${M2}`,
                fontSize: 8.5, color: M2, fontStyle: "italic", fontFamily: "Georgia, serif",
                lineHeight: 1, flexShrink: 0,
              }}>i</span>
            </div>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: TX, lineHeight: 1 }}>{p.v}</div>
            <SparkSVG data={p.data} width={56} height={16} stroke={A} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RANK CARDS
// ─────────────────────────────────────────────────────────────────

function RankCard({
  rank, delta, deltaColor, type, sub,
}: { rank: string; delta: string; deltaColor?: string; type: "kuwait" | "arab" | "line"; sub: string }) {
  return (
    <div style={surf({ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, height: 116 })}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
        <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 52, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: TX }}>
          {rank}
        </span>
        <span style={LXS}>{sub}</span>
        <span style={{ fontSize: 11.5, color: deltaColor ?? M, marginTop: 2, fontFamily: MONO }}>{delta}</span>
      </div>
      <div style={{ width: 100, height: 64, opacity: 0.95, display: "flex", alignItems: "center" }}>
        {type === "kuwait" && <KuwaitMapSVG />}
        {type === "arab"   && <ArabWorldSVG />}
        {type === "line"   && <SparkSVG data={[2,3,3,4,5,6,7,8,9,11,12,14]} width={100} height={36} stroke={A} />}
      </div>
    </div>
  );
}

function OutperformingCard({ pct }: { pct: number }) {
  return (
    <div style={surf({ padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, height: 116 })}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
        <span style={LXS}>Outperforming</span>
        <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 52, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: A }}>
          {pct}<span style={{ fontSize: 28, color: TX }}>%</span>
        </span>
        <span style={{ fontSize: 10.5, color: M, letterSpacing: "0.18em", fontFamily: MONO }}>OF CREATORS</span>
      </div>
      <div style={{ width: 120, height: 74 }}>
        <DottedMapSVG width={120} height={74} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// KPI STRIP
// ─────────────────────────────────────────────────────────────────

function KPIStrip({
  totalFollowers, growth30dPct, growth7dPct,
  growth30dDelta, growth7dDelta, momentumScore, rankMovement,
}: {
  totalFollowers: number | null;
  growth30dPct: number | null;
  growth7dPct: number | null;
  growth30dDelta: number | null;
  growth7dDelta: number | null;
  momentumScore: number | null;
  rankMovement: number | null;
}) {
  function fmtPct(n: number | null) {
    if (n === null) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  }

  const cards = [
    {
      label: "Total Followers",
      value: totalFollowers !== null ? fmtN(totalFollowers) : "—",
      custom: growth30dPct !== null ? `${growth30dPct >= 0 ? "+" : ""}${growth30dPct.toFixed(1)}% 30d` : null,
      delta: null as number | null,
      spark: [10,11,12,11,13,14,13,15,16,17,18,19,20,21,22],
      noData: totalFollowers === null,
    },
    {
      label: "30-Day Growth",
      value: fmtPct(growth30dPct),
      custom: growth30dDelta !== null ? `${growth30dDelta >= 0 ? "+" : ""}${fmtN(growth30dDelta)}` : "Not enough history",
      delta: null as number | null,
      spark: [3,3,4,4,5,5,6,6,7,8,9,10,11,12,13],
      noData: growth30dPct === null,
    },
    {
      label: "7-Day Growth",
      value: fmtPct(growth7dPct),
      custom: growth7dDelta !== null ? `${growth7dDelta >= 0 ? "+" : ""}${fmtN(growth7dDelta)}` : "Not enough history",
      delta: null as number | null,
      spark: [6,5,7,6,8,7,9,8,10,9,11,10,12,11,13],
      noData: growth7dPct === null,
    },
    {
      label: "Momentum Score",
      value: momentumScore !== null ? String(momentumScore) : "—",
      custom: momentumScore !== null
        ? momentumScore >= 70 ? "Rising Fast" : momentumScore >= 50 ? "Building" : "Stable"
        : "Not enough history",
      delta: null as number | null,
      spark: [60,62,64,63,66,68,70,72,75,77,79,82,84,86,88],
      noData: momentumScore === null,
    },
    {
      label: "Rank Movement",
      value: rankMovement === null ? "—"
        : rankMovement > 0 ? `↑ ${rankMovement}`
        : rankMovement < 0 ? `↓ ${Math.abs(rankMovement)}`
        : "—",
      custom: rankMovement === null ? "Not enough history" : "This Week",
      delta: null as number | null,
      spark: [3,4,3,5,4,6,7,6,8,7,9,10,9,11,12],
      noData: rankMovement === null,
    },
  ];

  return (
    <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
      {cards.map(k => (
        <div key={k.label} style={surf({ padding: "14px 16px", height: 114, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, overflow: "hidden" })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
            <span style={{ ...LXS, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</span>
            {k.noData && <span style={{ fontSize: 9, color: M2, fontFamily: MONO, flexShrink: 0 }}>—</span>}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: k.noData ? M2 : TX }}>
            {k.value}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
            <div style={{ flex: 1, height: 22, overflow: "hidden", minWidth: 0 }}>
              <SparkSVG data={k.spark} width={90} height={22} stroke={k.noData ? M2 : A} />
            </div>
            {k.delta !== null
              ? <Delta value={k.delta} />
              : <span style={{ fontSize: 10, color: k.noData ? M2 : M, whiteSpace: "nowrap", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>{k.custom}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 30-DAY CHART
// ─────────────────────────────────────────────────────────────────

type ChartDay = { date: string; [key: string]: string | number };

const CHART_SERIES_COLORS: Record<string, string> = {
  twitch: "#9147ff", instagram: "#e25555", tiktok: "#5fb8d6",
  youtube: "#cf6dab", kick: "#53FC18",
};

function ChartPanel({ chartData, platforms }: { chartData: ChartDay[]; platforms: string[] }) {
  const W = 860, H = 260, PL = 50, PR = 20, PT = 16, PB = 28;
  const IW = W - PL - PR, IH = H - PT - PB;

  const allVals = chartData.flatMap(d =>
    platforms.map(p => (d[p] as number) ?? 0)
  ).filter(v => v > 0);
  const maxVal = Math.max(...allVals) * 1.12 || 1;
  const xStep = chartData.length > 1 ? IW / (chartData.length - 1) : IW;
  const yToPx = (v: number) => PT + IH - (v / maxVal) * IH;

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i));
  const xLabelIdxs = [0, 7, 14, 21, 29].filter(i => i < chartData.length);

  return (
    <div style={surf({ padding: 22 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={LXS}>30-Day Growth</span>
        <div style={{ display: "flex", gap: 16 }}>
          {platforms.map(p => (
            <span key={p} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: M }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_SERIES_COLORS[p] ?? M, display: "inline-block" }} />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
          ))}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {yTicks.map((t, i) => {
          const y = yToPx(t);
          return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke={BS} strokeWidth={0.7} strokeDasharray="2 4" />
              <text x={PL - 8} y={y + 4} fontSize={10} fill={M2} textAnchor="end" fontFamily={MONO}>
                {t >= 1000 ? `${Math.round(t / 1000)}K` : t}
              </text>
            </g>
          );
        })}
        {xLabelIdxs.map(i => (
          <text key={i} x={PL + i * xStep} y={H - 6} fontSize={10} fill={M2} textAnchor="middle" fontFamily={MONO}>
            {String(chartData[i]?.date ?? "").slice(5)}
          </text>
        ))}
        {platforms.map(p => {
          const color = CHART_SERIES_COLORS[p] ?? M;
          const path = chartData.map((d, i) => {
            const v = (d[p] as number) ?? 0;
            return `${i === 0 ? "M" : "L"}${(PL + i * xStep).toFixed(1)},${yToPx(v).toFixed(1)}`;
          }).join(" ");
          const lastD = chartData[chartData.length - 1];
          const lastV = (lastD?.[p] as number) ?? 0;
          return (
            <g key={p}>
              <path d={path} fill="none" stroke={color} strokeWidth={1.4} opacity={0.9} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={PL + (chartData.length - 1) * xStep} cy={yToPx(lastV)} r={2.5} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PLATFORM PERFORMANCE TABLE
// ─────────────────────────────────────────────────────────────────

function PlatformTable({
  platforms,
}: {
  platforms: Array<{ platform: string; followers: number; growth30d: number | null; sparkData: number[]; platform_username: string }>;
}) {
  return (
    <div style={surf({ padding: 22 })}>
      <span style={{ ...LXS, display: "block", marginBottom: 16 }}>Platform Performance</span>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Platform", "Followers", "30d Growth", "Trend"].map((h, i) => (
              <th key={h} style={{ textAlign: i === 3 ? "right" : "left", padding: "0 12px 10px", fontSize: 10.5, color: M, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: `1px solid ${BRD}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {platforms.map(p => {
            const color = CHART_SERIES_COLORS[p.platform] ?? M;
            return (
              <tr key={p.platform} style={{ borderBottom: `1px solid ${BS}` }}>
                <td style={{ padding: "10px 12px" }}>
                  <a href={platformUrl(p.platform, p.platform_username)}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: `${color}20`, border: `1px solid ${color}50`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontFamily: MONO, color, fontWeight: 700 }}>
                      {p.platform.slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 13, color: TX, textTransform: "capitalize" }}>{p.platform}</span>
                  </a>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontVariantNumeric: "tabular-nums", color: TX }}>{fmtN(p.followers)}</td>
                <td style={{ padding: "10px 12px" }}>
                  {p.growth30d !== null ? <Delta value={p.growth30d} /> : <span style={{ color: M2 }}>—</span>}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <SparkSVG data={p.sparkData} width={80} height={20} stroke={color} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { handle } = await params;
  const supabase = await createClient();

  // ── Fetch creator + platforms ────────────────────────────────────
  const { data: creator, error } = await supabase
    .from("creators")
    .select(`*, platforms:creator_platforms(*)`)
    .eq("handle", handle)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (error || !creator) notFound();

  // ── Fetch latest SAHA score ──────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { data: dailyScore } = await supabase
    .from("creator_daily_scores")
    .select("saha_score, momentum_score, rank_country, rank_arab_world, calculated_date")
    .eq("creator_id", creator.id)
    .lte("calculated_date", today)
    .order("calculated_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback to legacy creator_scores if no daily score
  const { data: legacyScore } = !dailyScore
    ? await supabase.from("creator_scores").select("final_score").eq("creator_id", creator.id).maybeSingle()
    : { data: null };

  // ── Fetch growth ─────────────────────────────────────────────────
  const { data: growth } = await supabase
    .from("creator_growth")
    .select("period, followers_delta, growth_pct, followers_start, followers_end")
    .eq("creator_id", creator.id);

  // ── Fetch 30-day snapshots for chart ─────────────────────────────
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: snapshots } = await supabase
    .from("creator_snapshots")
    .select("platform, followers, snapshot_date")
    .eq("creator_id", creator.id)
    .gte("snapshot_date", d30)
    .lte("snapshot_date", today)
    .order("snapshot_date", { ascending: true });

  // ── Fetch prev-week rank snapshot ────────────────────────────────
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const { data: prevRankSnap } = await supabase
    .from("creator_rank_snapshots")
    .select("rank_country")
    .eq("creator_id", creator.id)
    .gte("snapshot_date", d7)
    .lte("snapshot_date", today)
    .order("snapshot_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  // ── Derived values ───────────────────────────────────────────────
  const country = getCountry(creator.country_code as string);

  const platforms = (creator.platforms ?? []) as Array<{
    id: string; platform: string; followers: number;
    platform_username: string; is_live: boolean;
  }>;

  const totalFollowers = platforms.reduce((s, p) => s + Number(p.followers ?? 0), 0);

  type GrowthRow = { period: string; followers_delta: number; growth_pct: string; followers_start: number; followers_end: number };
  const growthMap = new Map((growth ?? []).map((g) => [(g as GrowthRow).period, g as GrowthRow]));
  const growth30d = growthMap.get("30d");
  const growth7d  = growthMap.get("7d");

  const growth30dPct   = growth30d?.growth_pct   ? Number(growth30d.growth_pct)   : null;
  const growth7dPct    = growth7d?.growth_pct    ? Number(growth7d.growth_pct)    : null;
  const growth30dDelta = growth30d?.followers_delta != null ? Number(growth30d.followers_delta) : null;
  const growth7dDelta  = growth7d?.followers_delta  != null ? Number(growth7d.followers_delta)  : null;

  const sahaScore      = dailyScore?.saha_score    ? Number(dailyScore.saha_score)    : legacyScore ? Number((legacyScore as { final_score: number }).final_score) : 0;
  const momentumScore  = dailyScore?.momentum_score ? Number(dailyScore.momentum_score) : null;
  const rankCountry    = dailyScore?.rank_country   ?? null;
  const rankArabWorld  = dailyScore?.rank_arab_world ?? null;

  // Rank movement (vs 7 days ago)
  const rankMovement: number | null = (rankCountry && prevRankSnap?.rank_country)
    ? (prevRankSnap.rank_country as number) - rankCountry
    : null;

  // ── Chart data ───────────────────────────────────────────────────
  type SnapRow = { platform: string; followers: number; snapshot_date: string };
  const snapRows = (snapshots ?? []) as SnapRow[];

  // Build date → { platform: followers } map
  const chartMap = new Map<string, ChartDay>();
  for (const r of snapRows) {
    const existing = chartMap.get(r.snapshot_date) ?? { date: r.snapshot_date };
    existing[r.platform] = Number(r.followers);
    chartMap.set(r.snapshot_date, existing);
  }
  const chartDataReal: ChartDay[] = Array.from(chartMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
  const chartPlatforms = [...new Set(snapRows.map(r => r.platform))];

  // Fallback to mock chart if insufficient real data
  const hasSufficientChart = chartDataReal.length >= 5 && chartPlatforms.length > 0;
  const chartData: ChartDay[] = hasSufficientChart
    ? chartDataReal
    : Array.from({ length: 30 }, (_, i) => {
        const d = new Date(d30);
        d.setDate(d.getDate() + i);
        const base: ChartDay = { date: d.toISOString().slice(0, 10) };
        for (const p of platforms.slice(0, 3)) {
          base[p.platform] = Math.round((p.followers * 0.85) + i * (p.followers * 0.005) + Math.sin(i * 0.7) * (p.followers * 0.02));
        }
        return base;
      });
  const chartPlatformsFinal = hasSufficientChart ? chartPlatforms : platforms.slice(0, 3).map(p => p.platform);

  // ── Platform sparklines (from 30-day snapshots) ──────────────────
  const platformSparkMap = new Map<string, number[]>();
  for (const r of snapRows) {
    const arr = platformSparkMap.get(r.platform) ?? [];
    arr.push(Number(r.followers));
    platformSparkMap.set(r.platform, arr);
  }

  // Per-platform 30d growth %
  const platformGrowthMap = new Map<string, number | null>();
  for (const [plat, vals] of platformSparkMap.entries()) {
    if (vals.length >= 2) {
      const start = vals[0], end = vals[vals.length - 1];
      platformGrowthMap.set(plat, start > 0 ? ((end - start) / start) * 100 : null);
    }
  }

  const platformRows = platforms.map(p => ({
    platform: p.platform,
    followers: p.followers,
    platform_username: p.platform_username,
    growth30d: platformGrowthMap.get(p.platform) ?? null,
    sparkData: platformSparkMap.get(p.platform)?.slice(-12) ?? [p.followers * 0.88, p.followers],
  }));

  const PLAT_COLORS: Record<string, string> = {
    twitch: "#9147ff", instagram: "#e25555", tiktok: "#5fb8d6",
    youtube: "#cf6dab", kick: "#53FC18", discord: "#5865F2", x: "#F5EFE0",
  };

  const movLabel = rankMovement === null
    ? "No movement data"
    : rankMovement > 0 ? `↑ ${rankMovement} this week`
    : rankMovement < 0 ? `↓ ${Math.abs(rankMovement)} this week`
    : "Stable this week";
  const movColor = rankMovement && rankMovement > 0 ? UP : rankMovement && rankMovement < 0 ? DN : M;

  const scoreLabel = sahaScore > 0 ? `Ranked #${rankCountry ?? "—"} · ${country?.name_en ?? ""}` : "Calculating…";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0912", fontFamily: "var(--font-inter), sans-serif", color: TX }}>
      <HeaderPublic />

      <main style={{ maxWidth: 1380, margin: "0 auto", padding: "0 32px 64px" }}>

        {/* ── PAGE HEADER ──────────────────────────────────────────── */}
        <div style={{ marginTop: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <span style={LXS}>Creator Profile</span>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, fontWeight: 500, letterSpacing: "-0.01em", fontFamily: SERIF, color: TX, lineHeight: 1.1 }}>
              {(creator.name_ar as string) || (creator.name_en as string)}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {(creator.is_live as boolean) && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", border: `1px solid ${BRD}`, borderRadius: 4, fontSize: 11, color: TX }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e25555", display: "inline-block" }} className="live-dot-v2" />
                LIVE NOW
              </span>
            )}
            <button style={{ height: 34, padding: "0 14px", background: "transparent", border: `1px solid ${BRD}`, borderRadius: 8, color: TX, fontSize: 12.5, cursor: "pointer" }}>
              Share Profile
            </button>
          </div>
        </div>

        {/* ── HERO — 3-COLUMN GRID ─────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px 1fr", gap: 18, alignItems: "start" }}>

          {/* LEFT — Identity + Platforms */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Identity card */}
            <div style={surf({ padding: 24 })}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                {/* Avatar */}
                {creator.avatar_url ? (
                  <div style={{ width: 100, height: 100, flexShrink: 0, borderRadius: "50%", padding: 2, background: "linear-gradient(180deg, rgba(244,165,44,0.85), rgba(244,165,44,0.2))" }}>
                    <img src={creator.avatar_url as string} width={96} height={96} alt={creator.name_en as string}
                      style={{ borderRadius: "50%", objectFit: "cover", display: "block", width: 96, height: 96 }} />
                  </div>
                ) : (
                  <AvatarEl size={100} label={(creator.handle as string).slice(0, 1).toUpperCase()} ring />
                )}

                {/* Name + meta */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                  {/* Name row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: ARABIC, fontSize: 32, fontWeight: 600, lineHeight: 1, color: TX }}>
                        {(creator.name_ar as string) || (creator.name_en as string)}
                      </span>
                      {(creator.is_verified as boolean) && <VerifiedBadge />}
                    </div>
                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 12px", background: "transparent", border: `1.5px solid ${A}`, borderRadius: 8, cursor: "pointer", color: TX, fontSize: 12.5, fontFamily: ARABIC, direction: "rtl", whiteSpace: "nowrap" }}>
                        <span style={{ color: A, fontSize: 11.5, fontFamily: MONO }}>—</span>
                        <span>متابع</span>
                      </button>
                      <button style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, flexShrink: 0, background: "transparent", border: `1.5px solid ${BRD}`, borderRadius: 8, cursor: "pointer" }}>
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </button>
                      <button style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", background: "transparent", border: `1.5px solid ${BRD}`, borderRadius: 8, cursor: "pointer", color: TX, fontSize: 12.5, whiteSpace: "nowrap" }}>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={TX} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        Favorite
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: M, fontSize: 13.5 }}>
                    <span>@{creator.handle as string}</span>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: M2, display: "inline-block" }} />
                    <span>{country?.flag} {country?.name_en}</span>
                  </div>
                  {/* Genre tags */}
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {(creator.genres as string[] ?? []).map((g: string) => (
                      <span key={g} style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 10px", background: EL, border: `1px solid ${BRD}`, borderRadius: 999, fontSize: 11, color: TX }}>
                        {g}
                      </span>
                    ))}
                    {sahaScore > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 10px", background: EL, border: `1px solid ${BRD}`, borderRadius: 999, fontSize: 11, color: TX }}>
                        <span style={{ color: A, fontSize: 9 }}>✦</span>
                        {sahaScore >= 85 ? "SAHA Elite" : sahaScore >= 70 ? "SAHA Excellent" : "SAHA Building"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Platform grid */}
              <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {platforms.slice(0, 6).map(p => {
                  const color = PLAT_COLORS[p.platform] ?? M;
                  const growth = platformGrowthMap.get(p.platform);
                  return (
                    <a key={p.platform}
                      href={platformUrl(p.platform, p.platform_username)}
                      target="_blank" rel="noopener noreferrer"
                      style={{ height: 58, padding: "0 12px", background: SF, border: `1px solid ${BRD}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 5, background: `${color}20`, border: `1px solid ${color}50`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: MONO, color, fontWeight: 600, flexShrink: 0 }}>
                        {p.platform.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, color: TX, textTransform: "capitalize" }}>{p.platform}</span>
                          {growth !== null && growth !== undefined && (
                            <span style={{ fontSize: 10, color: (growth ?? 0) >= 0 ? UP : DN, fontFamily: MONO }}>
                              {(growth ?? 0) >= 0 ? "+" : ""}{(growth ?? 0).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 13, color: M, fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>
                          {fmtN(p.followers)}
                        </span>
                      </div>
                    </a>
                  );
                })}
                {Array.from({ length: Math.max(0, 6 - platforms.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ height: 58, padding: "0 12px", background: SF, border: `1px solid ${BS}`, borderRadius: 10, display: "flex", alignItems: "center", opacity: 0.25 }}>
                    <span style={{ fontSize: 11, color: M2, fontFamily: MONO }}>—</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total follower bar */}
            <div style={surf({ padding: "18px 22px", display: "flex", alignItems: "center", gap: 22 })}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={LXS}>Total Audience</span>
                <span style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: TX }}>
                  {fmtN(totalFollowers)}
                </span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {platforms.slice(0, 4).map(p => {
                  const pct = totalFollowers > 0 ? (p.followers / totalFollowers) * 100 : 0;
                  const color = PLAT_COLORS[p.platform] ?? M;
                  return (
                    <div key={p.platform} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: M, width: 60, textTransform: "capitalize" }}>{p.platform}</span>
                      <div style={{ flex: 1, height: 3, background: BS, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, opacity: 0.75 }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: M, fontFamily: MONO, width: 32, textAlign: "right" }}>{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CENTER — Score Ring */}
          <ScoreRing score={sahaScore > 0 ? sahaScore : 0} label={scoreLabel} />

          {/* RIGHT — Rankings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <RankCard
              rank={rankCountry ? `#${rankCountry}` : "#—"}
              delta={movLabel}
              deltaColor={movColor}
              type="kuwait"
              sub={`IN ${(country?.name_en ?? "COUNTRY").toUpperCase()}`}
            />
            <RankCard
              rank={rankArabWorld ? `#${rankArabWorld}` : "#—"}
              delta={rankArabWorld ? `Ranked in Arab World` : "Not yet ranked"}
              deltaColor={rankArabWorld ? M : M2}
              type="arab"
              sub="IN ARAB WORLD"
            />
            <RankCard
              rank="Top 1%"
              delta="Top performance tier"
              type="line"
              sub="GENRE RANKING"
            />
            <OutperformingCard pct={82} />
          </div>
        </div>

        {/* ── KPI STRIP ────────────────────────────────────────────── */}
        <KPIStrip
          totalFollowers={totalFollowers}
          growth30dPct={growth30dPct}
          growth7dPct={growth7dPct}
          growth30dDelta={growth30dDelta}
          growth7dDelta={growth7dDelta}
          momentumScore={momentumScore}
          rankMovement={rankMovement}
        />

        {/* ── CHART + PLATFORM TABLE ────────────────────────────────── */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
          <ChartPanel chartData={chartData} platforms={chartPlatformsFinal} />
          <PlatformTable platforms={platformRows} />
        </div>


      </main>
    </div>
  );
}
