import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCountry } from "@/lib/constants/countries";
import { HeaderAnalytics } from "@/components/analytics/header-analytics";
import { CalibrationRing } from "@/components/analytics/calibration-ring";
import type { CreatorWithStats } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────
// MOCK ANALYTICS DATA
// TODO: Replace with Supabase queries when analytics
//       tables have sufficient historical data (30+ days)
// ─────────────────────────────────────────────────────────────────
const mockAnalyticsData = {
  growth30dPct: 18.7,
  growthWeeklyPct: 4.3,
  momentumScore: 92,
  rankMovement: 2,

  chartData: Array.from({ length: 30 }, (_, i) => ({
    date: (() => {
      const d = new Date("2026-04-25");
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    })(),
    twitch:    Math.round(10000 + i * 833  + Math.sin(i * 0.8) * 400),
    instagram: Math.round( 8000 + i * 467  + Math.sin(i * 0.6) * 250),
    tiktok:    Math.round( 4000 + i * 300  + Math.cos(i * 0.9) * 150),
    youtube:   Math.round( 2000 + i * 200  + Math.cos(i * 0.5) * 100),
  })),

  platformPerformance: [
    { id: "twitch",    followers: 35000, growth: 22.4, sparkData: [18,19,20,20,21,21,22,22,23,22,23,22.4] },
    { id: "instagram", followers: 22000, growth: 18.1, sparkData: [14,15,15,16,16,17,17,17,18,18,18,18.1] },
    { id: "tiktok",    followers: 13000, growth: 16.7, sparkData: [11,12,13,13,14,14,15,15,16,16,17,16.7] },
    { id: "youtube",   followers:  8000, growth: 13.9, sparkData: [ 9,10,10,11,11,12,12,13,13,14,14,13.9] },
  ],

  topCreators: [
    { rank: 1, name: "AboFlah",      arabic: false, score: 92, scoreDelta: 4, rankDelta:  0, followers: "1.9M",  growth: 18.7, tone: "warm",  you: false },
    { rank: 2, name: "P4GAM3R",      arabic: false, score: 91, scoreDelta: 3, rankDelta:  0, followers: "986K",  growth: 16.3, tone: "cool",  you: false },
    { rank: 3, name: "سبيكس",        arabic: true,  score: 89, scoreDelta: 7, rankDelta:  2, followers: "1.35M", growth: 14.3, tone: "warm",  you: true  },
    { rank: 4, name: "Azizoz",       arabic: false, score: 87, scoreDelta: 2, rankDelta: -1, followers: "1.1M",  growth: 9.1,  tone: "plum",  you: false },
    { rank: 5, name: "Ahmed Show",   arabic: false, score: 86, scoreDelta: 5, rankDelta:  0, followers: "1.2M",  growth: 12.8, tone: "olive", you: false },
  ],
};

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────
const A   = "#F4A52C";   // accent
const BRD = "#2A263A";   // border
const BS  = "#1f1c2e";   // border-soft
const TX  = "#F5EFE0";   // text
const M   = "#A7A0B8";   // muted
const M2  = "#6f6982";   // muted-2
const UP  = "#6ec98c";   // up
const DN  = "#d96a6a";   // down
const SF  = "#0F1118";   // surface
const EL  = "#19162A";   // elevated
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
// PRIMITIVE HELPERS
// ─────────────────────────────────────────────────────────────────

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function platformUrl(p: string, u: string): string {
  const map: Record<string, string> = {
    twitch: `https://twitch.tv/${u}`,
    youtube: `https://youtube.com/@${u}`,
    tiktok: `https://tiktok.com/@${u}`,
    instagram: `https://instagram.com/${u}`,
    kick: `https://kick.com/${u}`,
  };
  return map[p] ?? "#";
}

function SparkSVG({
  data, width = 80, height = 22, stroke = A, fill = false,
}: { data: number[]; width?: number; height?: number; stroke?: string; fill?: boolean }) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...data), max = Math.max(...data);
  const span = (max - min) || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => [
    +(i * stepX).toFixed(1),
    +(height - ((v - min) / span) * (height - 4) - 2).toFixed(1),
  ] as [number, number]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {fill && <path d={area} fill={stroke} opacity={0.15} />}
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

function AvatarEl({ size = 42, label = "?", tone = "default", ring = false }: {
  size?: number; label?: string; tone?: string; ring?: boolean;
}) {
  const palettes: Record<string, [string, string]> = {
    default: ["#2b2440", "#15101f"], warm:  ["#3a2a1f", "#1d130c"],
    cool:    ["#1f2b3a", "#0c121d"], plum:  ["#34203a", "#1a0f1f"],
    olive:   ["#2c2e1f", "#15170c"], rose:  ["#3a2030", "#1d0f1a"],
  };
  const [c1, c2] = palettes[tone] ?? palettes.default;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      padding: ring ? 2 : 0,
      background: ring ? "linear-gradient(180deg, rgba(244,165,44,0.85), rgba(244,165,44,0.2))" : "transparent",
      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <div style={{
        width: ring ? size - 4 : size, height: ring ? size - 4 : size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: SERIF, fontSize: Math.round(size * 0.42), fontWeight: 500,
        color: "rgba(245,239,224,0.55)",
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Accurate Kuwait outline (Gulf coast + Kuwait Bay on east side) ──
const KUWAIT_PATH =
  "M 15 22 L 18 14 L 42 10 L 55 8 L 62 14 L 66 28 L 68 44 " +
  "L 62 56 L 52 66 L 54 72 L 48 76 L 25 78 L 12 66 L 10 44 L 12 30 Z";

// ── Arab world country outlines (simplified but recognizable) ──
const AW_FILL   = "rgba(140,133,160,0.18)";
const AW_STROKE = "rgba(167,160,184,0.55)";
const AW_SW     = "0.7";

function ArabWorldDetailedSVG({ width = 155, height = 105 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 130" style={{ display: "block" }}>
      {/* Morocco */}
      <path d="M 5 44 L 18 34 L 20 22 L 16 12 L 10 14 L 6 28 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Algeria */}
      <path d="M 18 34 L 58 30 L 62 15 L 20 12 L 16 12 L 20 22 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Tunisia */}
      <path d="M 58 30 L 65 26 L 68 34 L 62 36 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Libya */}
      <path d="M 62 15 L 90 11 L 92 38 L 68 40 L 62 36 L 68 34 L 65 26 L 58 30 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Egypt */}
      <path d="M 90 11 L 110 8 L 114 34 L 106 42 L 95 44 L 92 38 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Mauritania */}
      <path d="M 5 44 L 6 28 L 10 14 L 16 12 L 18 34 L 22 58 L 12 62 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Mali / Niger */}
      <path d="M 18 34 L 22 58 L 38 64 L 65 62 L 68 40 L 62 36 L 58 30 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Chad */}
      <path d="M 68 40 L 65 62 L 80 68 L 90 70 L 92 48 L 92 38 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Sudan */}
      <path d="M 92 38 L 92 48 L 90 70 L 106 74 L 114 62 L 116 44 L 106 42 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Somalia */}
      <path d="M 116 44 L 114 34 L 130 28 L 138 42 L 132 58 L 120 70 L 114 62 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Djibouti */}
      <path d="M 116 56 L 120 53 L 122 58 L 118 62 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Syria */}
      <path d="M 110 8 L 128 5 L 136 10 L 138 18 L 128 22 L 114 20 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Lebanon (tiny) */}
      <path d="M 112 20 L 116 19 L 116 25 L 112 26 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Iraq */}
      <path d="M 128 5 L 140 6 L 144 14 L 142 30 L 132 34 L 120 36 L 114 34 L 114 20 L 128 22 L 138 18 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Jordan */}
      <path d="M 106 42 L 114 34 L 120 36 L 118 46 L 112 50 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Kuwait (small) */}
      <path d="M 142 30 L 146 27 L 148 32 L 144 36 L 142 30 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Saudi Arabia */}
      <path d="M 120 36 L 132 34 L 142 30 L 144 36 L 150 36 L 152 50 L 148 64 L 136 68 L 120 72 L 112 64 L 114 62 L 116 44 L 118 46 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* UAE / Bahrain / Qatar */}
      <path d="M 150 36 L 156 32 L 160 40 L 158 52 L 152 54 L 152 50 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Oman */}
      <path d="M 156 32 L 164 28 L 170 38 L 168 56 L 160 64 L 152 64 L 148 64 L 152 54 L 158 52 L 160 40 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
      {/* Yemen */}
      <path d="M 120 72 L 136 68 L 148 64 L 152 64 L 155 72 L 144 78 L 128 80 L 118 76 L 114 70 Z" fill={AW_FILL} stroke={AW_STROKE} strokeWidth={AW_SW} />
    </svg>
  );
}

// ── Gold particle Arab world (Outperforming card) ──
function GoldParticleArabWorld({ width = 160, height = 110 }: { width?: number; height?: number }) {
  // Seed-based pseudo-random for deterministic output
  const dots: { x: number; y: number; r: number; o: number }[] = [];
  // Define the Arab world as a list of rectangular zones with density
  const zones = [
    // [x, y, w, h, density] — in a 200x130 space
    [5, 12, 22, 52, 0.45],    // Morocco + Mauritania
    [18, 12, 48, 55, 0.5],    // Algeria
    [62, 11, 30, 55, 0.48],   // Libya
    [90, 8, 26, 54, 0.5],     // Egypt + Sudan top
    [90, 48, 26, 26, 0.4],    // Sudan mid
    [38, 58, 30, 14, 0.35],   // Mali/Niger bottom
    [65, 58, 30, 14, 0.35],   // Chad bottom
    [106, 54, 14, 22, 0.4],   // Sudan/Somalia bottom
    [110, 5, 34, 36, 0.5],    // Syria/Iraq
    [106, 36, 48, 42, 0.55],  // Saudi + Jordan
    [148, 28, 22, 38, 0.45],  // Oman/UAE
    [118, 66, 38, 14, 0.4],   // Yemen
    [114, 26, 8, 36, 0.3],    // Jordan/Lebanon
  ];
  let seed = 42;
  function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 4294967296; }
  for (const [zx, zy, zw, zh, density] of zones) {
    const count = Math.round((zw * zh) * (density as number) * 0.08);
    for (let i = 0; i < count; i++) {
      const x = (zx as number) + rand() * (zw as number);
      const y = (zy as number) + rand() * (zh as number);
      const r = 0.6 + rand() * 1.0;
      const o = 0.35 + rand() * 0.65;
      dots.push({ x, y, r, o });
    }
  }
  return (
    <svg width={width} height={height} viewBox="0 0 200 130" style={{ display: "block" }}>
      <defs>
        <filter id="gp-glow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#gp-glow)">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={A} opacity={d.o} />
        ))}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────

function PageHeader({ name }: { name: string }) {
  return (
    <div style={{ marginTop: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={LXS}>Creator Overview</span>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 500, letterSpacing: "-0.01em", fontFamily: SERIF, color: TX }}>
          {name}
        </h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", border: `1px solid ${BRD}`, borderRadius: 4, fontSize: 11, color: TX }}>
          <span className="live-dot-v2" style={{ width: 6, height: 6, borderRadius: "50%", background: "#e25555", display: "inline-block" }} />
          LIVE DATA
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 9px", border: `1px solid ${BRD}`, borderRadius: 4, fontSize: 11, color: TX }}>
          As of May 8, 2026 · 14:42 KWT
        </span>
        <button style={{ height: 34, padding: "0 14px", background: "transparent", border: `1px solid ${BRD}`, borderRadius: 8, color: TX, fontSize: 12.5, cursor: "pointer" }}>
          Share Profile
        </button>
        <button style={{ height: 34, padding: "0 14px", background: A, border: `1px solid ${A}`, borderRadius: 8, color: "#1a1426", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Export Press Card
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HERO — IDENTITY COLUMN
// ─────────────────────────────────────────────────────────────────

interface CreatorPlatformEntry {
  platform: string;
  platform_username: string;
  followers: number;
}

const PLAT_COLORS: Record<string, string> = {
  twitch: "#9147ff", instagram: "#e25555", tiktok: "#5fb8d6",
  youtube: "#cf6dab", kick: "#53FC18", discord: "#5865F2", x: "#F5EFE0",
};

function IdentityColumn({ creator }: { creator: CreatorWithStats }) {
  const country = getCountry(creator?.country_code ?? "KW");
  const platforms = ((creator?.platforms ?? []) as CreatorPlatformEntry[]).slice(0, 6);

  const dna = [
    { k: "Signature Genre", tags: ["Horror", "RPG", "Variety"] },
    { k: "Audience Type",   tags: ["Core Gamers", "18–34"] },
    { k: "Stream Persona",  tags: ["Intense", "Humorous"] },
    { k: "Peak Game",       tags: ["Resident Evil 4"] },
    { k: "Activity Score",  tags: ["Active"] },
    { k: "Active Time",     tags: ["7PM – 1AM (KWT)"] },
  ];

  const schedule = [
    { day: "MON", time: "7:00 PM" },
    { day: "WED", time: "7:00 PM" },
    { day: "FRI", time: "7:00 PM" },
    { day: "SUN", time: "8:00 PM" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Identity card */}
      <div style={surf({ padding: 24 })}>
        <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
          {/* Avatar */}
          {creator?.avatar_url ? (
            <div style={{ width: 108, height: 108, flexShrink: 0, borderRadius: "50%", padding: 2, background: "linear-gradient(180deg, rgba(244,165,44,0.85), rgba(244,165,44,0.2))" }}>
              <img src={creator.avatar_url} width={104} height={104} alt={creator.name_en}
                style={{ borderRadius: "50%", objectFit: "cover", display: "block", width: 104, height: 104 }} />
            </div>
          ) : (
            <AvatarEl size={108} label={(creator?.handle ?? "S").slice(0, 1).toUpperCase()} tone="warm" ring />
          )}

          {/* Name + meta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, flex: 1 }}>
            {/* Name row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: ARABIC, fontSize: 36, fontWeight: 600, lineHeight: 1, color: TX }}>
                  {creator?.name_ar ?? creator?.name_en ?? "Spiex"}
                </span>
                <VerifiedBadge />
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* Follow button */}
                <button style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 36, padding: "0 14px",
                  background: "transparent", border: `1.5px solid ${A}`,
                  borderRadius: 8, cursor: "pointer", color: TX, fontSize: 13,
                  fontFamily: ARABIC, direction: "rtl", whiteSpace: "nowrap",
                }}>
                  <span style={{ color: A, fontSize: 12, fontFamily: MONO }}>730</span>
                  <span>متابع</span>
                  <span style={{ color: UP, fontSize: 11, fontFamily: MONO }}>✓</span>
                </button>
                {/* Bell button */}
                <button style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 36, height: 36, flexShrink: 0,
                  background: "transparent", border: `1.5px solid ${BRD}`,
                  borderRadius: 8, cursor: "pointer",
                }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
                {/* Favorite button */}
                <button style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 36, padding: "0 14px",
                  background: "transparent", border: `1.5px solid ${BRD}`,
                  borderRadius: 8, cursor: "pointer", color: TX, fontSize: 13,
                  whiteSpace: "nowrap",
                }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={TX} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  Favorite
                </button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: M, fontSize: 14 }}>
              <span>@{creator?.handle ?? "spiex"}</span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: M2, display: "inline-block" }} />
              <span>{country?.flag} {country?.name_en ?? "Kuwait"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {[["✦", "SAHA Elite"], ["★", "Top 1% Kuwait"], ["⟳", "Synchronized"]].map(([ic, label], idx) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 27, padding: "0 11px", background: EL, border: `1px solid ${BRD}`, borderRadius: 999, fontSize: 11.5, color: idx === 2 ? M : TX }}>
                  <span style={{ color: A, fontSize: 10 }}>{ic}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Platform 3×3 grid */}
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {platforms.map(p => {
            const color = PLAT_COLORS[p.platform] ?? M;
            return (
              <a key={p.platform} href={platformUrl(p.platform, p.platform_username)}
                target="_blank" rel="noopener noreferrer"
                style={{ height: 60, padding: "0 12px", background: SF, border: `1px solid ${BRD}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: `${color}20`, border: `1px solid ${color}50`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: MONO, color, fontWeight: 600, flexShrink: 0 }}>
                  {p.platform.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11.5, color: TX, textTransform: "capitalize" }}>{p.platform}</span>
                    <span style={{ fontSize: 10.5, color: UP, fontFamily: MONO }}>+12%</span>
                  </div>
                  <span style={{ fontSize: 13, color: M, fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}>{fmtN(p.followers)}</span>
                </div>
              </a>
            );
          })}
          {/* Placeholder slots if < 6 platforms */}
          {Array.from({ length: Math.max(0, 6 - platforms.length) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ height: 60, padding: "0 12px", background: SF, border: `1px solid ${BS}`, borderRadius: 12, display: "flex", alignItems: "center", opacity: 0.25 }}>
              <span style={{ fontSize: 11, color: M2, fontFamily: MONO }}>—</span>
            </div>
          ))}
        </div>
      </div>

      {/* Creator DNA */}
      <div style={surf({ padding: 22 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={LXS}>Creator DNA</span>
          <span style={{ fontSize: 10.5, color: M2, letterSpacing: "0.06em", fontFamily: MONO }}>SYNCHRONIZED · 04:12</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {dna.map(row => (
            <div key={row.k} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ fontSize: 12.5, color: M, width: 150, flexShrink: 0, paddingTop: 2 }}>{row.k}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {row.tags.map(t => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 9px", border: `1px solid ${BRD}`, borderRadius: 4, fontSize: 11, color: TX }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stream Schedule */}
      <div style={surf({ padding: 20 })}>
        <span style={LXS}>Stream Schedule</span>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          {schedule.map(sl => (
            <div key={sl.day} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, letterSpacing: "0.16em", color: M, fontWeight: 500, fontFamily: MONO }}>{sl.day}</span>
              <span style={{ fontSize: 14, color: TX, fontVariantNumeric: "tabular-nums" }}>{sl.time}</span>
            </div>
          ))}
          <div style={{ paddingLeft: 18, borderLeft: `1px solid ${BS}`, minWidth: 128 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.18em", color: M2, fontFamily: MONO, display: "block" }}>NEXT STREAM IN</span>
            <span style={{ fontSize: 22, fontFamily: SERIF, color: A, marginTop: 4, display: "block", fontVariantNumeric: "tabular-nums" }}>3h 02m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HERO — CENTER COLUMN (SCORE RING)
// ─────────────────────────────────────────────────────────────────

function CenterColumn({ score, momentumScore, rankMovement, kuwaitRank }: { score: number; momentumScore: number | null; rankMovement: number | null; kuwaitRank: number | null }) {
  const size = 370;
  const radius = size / 2 - 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const scoreLabel = score >= 70 ? "EXCELLENT" : score >= 50 ? "GOOD" : "BUILDING";

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
    { k: "Growth",      v: 88, data: [3,5,4,6,5,7,8,7,9,10]  },
    { k: "Rank",        v: 90, data: [6,5,7,6,8,7,9,8,10,9]  },
    { k: "Presence",    v: 87, data: [5,6,5,7,6,8,7,9,8,10]  },
    { k: "Momentum",    v: 88, data: [4,5,4,6,5,7,8,9,10,11] },
    { k: "Consistency", v: 90, data: [7,6,8,7,9,8,9,8,9,10]  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Score ring card */}
      <div style={surf({ padding: 34, display: "flex", flexDirection: "column" })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={LXS}>SAHA Score Index</span>
          <span style={{ fontSize: 10.5, letterSpacing: "0.18em", color: M2, fontFamily: MONO }}>OFFICIAL · CERTIFIED</span>
        </div>

        {/* Ring */}
        <div style={{ position: "relative", width: size, margin: "0 auto", height: size, flexShrink: 0 }}>
          {/* Tick marks */}
          <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
            {ticks.map((t, i) => (
              <line key={i} x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)} x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)}
                stroke={t.long ? "rgba(245,239,224,0.18)" : "rgba(245,239,224,0.07)"}
                strokeWidth={t.long ? 1.2 : 0.8} />
            ))}
          </svg>

          {/* Progress arc */}
          <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            {/* Dark inner fill for contrast */}
            <circle cx={size / 2} cy={size / 2} r={radius - 4} fill="rgba(0,0,0,0.35)" />
            {/* Track ring */}
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={5} fill="none" />
            {/* Outer bloom (wide diffuse halo) */}
            <circle cx={size / 2} cy={size / 2} r={radius}
              stroke={A} strokeWidth={14} fill="none" opacity={0.12}
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
            {/* Mid bloom */}
            <circle cx={size / 2} cy={size / 2} r={radius}
              stroke={A} strokeWidth={8} fill="none" opacity={0.22}
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
            {/* Main arc */}
            <circle cx={size / 2} cy={size / 2} r={radius}
              stroke={A} strokeWidth={5} fill="none"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              style={{ filter: "drop-shadow(0 0 8px rgba(244,165,44,0.85)) drop-shadow(0 0 20px rgba(244,165,44,0.4))" }} />
          </svg>

          {/* Center text */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <span style={{ fontSize: 10.5, letterSpacing: "0.28em", color: M, fontFamily: MONO }}>SAHA SCORE</span>
            <span style={{ fontFamily: SERIF, fontSize: 88, lineHeight: 0.95, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX }}>
              {score}
            </span>
            <span style={{ fontSize: 12.5, letterSpacing: "0.32em", color: A, marginTop: 8, fontFamily: MONO }}>{scoreLabel}</span>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9.5, letterSpacing: "0.32em", color: M2, fontFamily: MONO }}>THIS MONTH</span>
              {rankMovement !== null && rankMovement !== 0 ? (
                <span style={{ fontFamily: SERIF, fontSize: 22, color: rankMovement > 0 ? UP : DN, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {rankMovement > 0 ? "↑" : "↓"} {Math.abs(rankMovement)} Rank Movement
                </span>
              ) : (
                <span style={{ fontFamily: SERIF, fontSize: 18, color: M, lineHeight: 1 }}>Stable</span>
              )}
              {kuwaitRank !== null && (
                <span style={{ fontSize: 11, color: A, fontFamily: MONO, letterSpacing: "0.16em", marginTop: 2 }}>
                  TOP 1% KUWAIT · #{kuwaitRank}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sub-pillars — full row at the bottom */}
        <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${BS}`, marginTop: 18 }}>
          {pillars.map((p, idx) => (
            <div key={p.k} style={{
              flex: 1, padding: "16px 0 18px", textAlign: "center",
              borderRight: idx < pillars.length - 1 ? `1px solid ${BS}` : "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              {/* Label + info icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10.5, color: M, letterSpacing: "0.04em" }}>{p.k}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 13, height: 13, borderRadius: "50%", border: `1px solid ${M2}`,
                  fontSize: 9, color: M2, fontStyle: "italic", fontFamily: "Georgia, serif",
                  lineHeight: 1, flexShrink: 0,
                }}>i</span>
              </div>
              {/* Value */}
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: TX, lineHeight: 1 }}>{p.v}</div>
              {/* Sparkline */}
              <SparkSVG data={p.data} width={64} height={18} stroke={A} />
            </div>
          ))}
        </div>
      </div>

      {/* Momentum panel — title row on top, full-width sparkline below */}
      <div style={surf({ padding: "20px 22px 0", overflow: "hidden" })}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={LXS}>Momentum State</span>
            <span style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, color: TX }}>
              {momentumScore !== null
                ? momentumScore >= 85 ? "Exploding"
                : momentumScore >= 70 ? "Rising Fast"
                : momentumScore >= 50 ? "Building Momentum"
                : momentumScore >= 30 ? "Stable"
                : "Cooling Down"
                : "Rising Fast"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: M, textAlign: "right", lineHeight: 1.6 }}>
            <div style={{ color: TX, fontSize: 12.5 }}>Momentum accelerating.</div>
            <div>Gaining loyal fans &amp;</div>
            <div>outperforming peers.</div>
          </div>
        </div>
        {/* Full-width sparkline — stretches to fill card width */}
        <div style={{ height: 90, overflow: "hidden" }}>
          {(() => {
            const data = [8,9,8,10,9,11,10,12,11,13,12,14,15,16,18,20,22,21,24,27];
            const min = Math.min(...data), max = Math.max(...data), span = (max - min) || 1;
            const W = 400, H = 90;
            const sx = W / (data.length - 1);
            const pts = data.map((v, i) => [+(i * sx).toFixed(1), +(H - ((v - min) / span) * (H - 4) - 2).toFixed(1)]);
            const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
            const area = `${d} L${W},${H} L0,${H} Z`;
            return (
              <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
                <path d={area} fill={A} opacity={0.12} />
                <path d={d} fill="none" stroke={A} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HERO — RANKINGS COLUMN
// ─────────────────────────────────────────────────────────────────

// ── Kuwait hero card — matches the golden silhouette reference ──
function KuwaitHeroCard({ rank, delta, deltaColor }: { rank: string; delta: string; deltaColor?: string }) {
  // Bar chart data — increasing trend, last bar highlighted
  const bars = [3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 11, 14];
  const maxBar = Math.max(...bars);

  // Scatter particles along the right edge of the silhouette
  const particles = [
    { cx: 182, cy: 28, r: 1.4, o: 0.7 }, { cx: 190, cy: 38, r: 1.0, o: 0.5 },
    { cx: 195, cy: 52, r: 1.6, o: 0.6 }, { cx: 188, cy: 62, r: 0.9, o: 0.4 },
    { cx: 196, cy: 74, r: 1.2, o: 0.55 }, { cx: 184, cy: 82, r: 0.8, o: 0.35 },
    { cx: 198, cy: 44, r: 0.7, o: 0.45 }, { cx: 193, cy: 68, r: 1.1, o: 0.5 },
    { cx: 200, cy: 58, r: 0.6, o: 0.3 }, { cx: 186, cy: 48, r: 1.3, o: 0.6 },
    { cx: 202, cy: 35, r: 0.8, o: 0.25 }, { cx: 197, cy: 88, r: 0.9, o: 0.3 },
    { cx: 178, cy: 22, r: 1.0, o: 0.45 }, { cx: 205, cy: 65, r: 0.6, o: 0.2 },
  ];

  return (
    <div style={{
      ...surf({ padding: 0, overflow: "hidden" }),
      height: 200, position: "relative",
      background: "linear-gradient(135deg, #0d0b14 0%, #110e1a 60%, #0a0810 100%)",
    }}>
      {/* Ambient golden glow behind silhouette */}
      <div style={{
        position: "absolute", right: -20, top: -20,
        width: 200, height: 220,
        background: `radial-gradient(ellipse at 60% 45%, ${A}22 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Kuwait silhouette + particles */}
      <svg
        width="100%" height="200"
        viewBox="0 0 280 200"
        preserveAspectRatio="xMaxYMid meet"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Golden gradient fill — bright left, fades right */}
          <linearGradient id="kw-gold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={A} stopOpacity="0.95" />
            <stop offset="55%"  stopColor={A} stopOpacity="0.80" />
            <stop offset="85%"  stopColor={A} stopOpacity="0.40" />
            <stop offset="100%" stopColor={A} stopOpacity="0.05" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="kw-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Clip to keep silhouette only */}
          <clipPath id="kw-clip">
            {/* Accurate Kuwait outline — main body + Bubiyan island hint */}
            <path d="
              M 88 10
              L 140 8
              L 152 14
              L 162 10
              L 178 18
              L 182 32
              L 186 48
              L 180 68
              L 172 82
              L 175 96
              L 165 108
              L 148 114
              L 120 116
              L 96 110
              L 78 96
              L 68 78
              L 64 58
              L 70 36
              L 80 20
              Z
            " />
          </clipPath>
        </defs>

        {/* Silhouette fill */}
        <path
          d="M 88 10 L 140 8 L 152 14 L 162 10 L 178 18 L 182 32 L 186 48 L 180 68 L 172 82 L 175 96 L 165 108 L 148 114 L 120 116 L 96 110 L 78 96 L 68 78 L 64 58 L 70 36 L 80 20 Z"
          fill="url(#kw-gold)"
          filter="url(#kw-glow)"
          opacity={0.92}
        />
        {/* Subtle inner shading */}
        <path
          d="M 88 10 L 140 8 L 152 14 L 162 10 L 178 18 L 182 32 L 186 48 L 180 68 L 172 82 L 175 96 L 165 108 L 148 114 L 120 116 L 96 110 L 78 96 L 68 78 L 64 58 L 70 36 L 80 20 Z"
          fill="none"
          stroke={A}
          strokeWidth="0.8"
          opacity={0.4}
        />

        {/* Scatter particles */}
        {particles.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={A} opacity={p.o} />
        ))}

        {/* Kuwait City dot */}
        <circle cx={158} cy={72} r={3} fill="#0d0b14" opacity={0.9} />
        <circle cx={158} cy={72} r={1.8} fill={A} opacity={1} />
        <circle cx={158} cy={72} r={5} fill={A} opacity={0.2} />

        {/* Bar chart — bottom strip */}
        {bars.map((v, i) => {
          const barW = 9;
          const barH = (v / maxBar) * 44;
          const x = 18 + i * (barW + 4);
          const y = 190 - barH;
          const isLast = i === bars.length - 1;
          return (
            <rect
              key={i} x={x} y={y} width={barW} height={barH}
              rx={2}
              fill={isLast ? A : "rgba(167,160,184,0.25)"}
              opacity={isLast ? 1 : 0.7}
            />
          );
        })}
        {/* Bar chart glow on last bar */}
        {(() => {
          const barW = 9;
          const barH = (bars[bars.length - 1] / maxBar) * 44;
          const x = 18 + (bars.length - 1) * (barW + 4);
          const y = 190 - barH;
          return <rect x={x} y={y} width={barW} height={barH} rx={2} fill={A} opacity={0.35} style={{ filter: `blur(4px)` }} />;
        })()}
      </svg>

      {/* Text overlay — left side */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "22px 22px 54px",
        gap: 8,
      }}>
        <span style={{ ...LXS }}>IN KUWAIT</span>
        <span style={{
          fontFamily: SERIF, fontSize: 64, lineHeight: 1, fontWeight: 600,
          letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX,
        }}>
          {rank}
        </span>
        <span style={{ fontSize: 13, color: deltaColor ?? M, fontFamily: MONO, letterSpacing: "0.04em" }}>
          {delta}
        </span>
      </div>
    </div>
  );
}

// ── Arab World hero card — dramatic 200px with detailed map ──
function ArabWorldHeroCard({ rank, delta, deltaColor }: { rank: string; delta: string; deltaColor?: string }) {
  return (
    <div style={{
      ...surf({ padding: 0, overflow: "hidden" }),
      height: 200, position: "relative",
      background: "linear-gradient(135deg, #0d0b14 0%, #0e0c1a 55%, #0a0810 100%)",
    }}>
      {/* Ambient glow behind map */}
      <div style={{
        position: "absolute", right: -10, top: 0,
        width: 220, height: 200,
        background: `radial-gradient(ellipse at 55% 50%, rgba(167,160,184,0.08) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Arab World map — right side */}
      <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.85 }}>
        <ArabWorldDetailedSVG width={165} height={112} />
      </div>

      {/* Subtle right-edge fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 60,
        background: "linear-gradient(to right, transparent, #0d0b14 85%)",
        pointerEvents: "none",
      }} />

      {/* Text overlay — left side */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "22px 22px 22px",
        gap: 8, zIndex: 2,
      }}>
        <span style={{ ...LXS }}>IN ARAB WORLD</span>
        <span style={{
          fontFamily: SERIF, fontSize: 64, lineHeight: 1, fontWeight: 600,
          letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX,
        }}>
          {rank}
        </span>
        <span style={{ fontSize: 13, color: deltaColor ?? M, fontFamily: MONO, letterSpacing: "0.04em" }}>
          {delta}
        </span>
      </div>
    </div>
  );
}

// ── Genre sparkline card ──
function GenreRankCard({ rank, delta, deltaColor }: { rank: string; delta: string; deltaColor?: string }) {
  return (
    <div style={surf({ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18, height: 124 })}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
        <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 38, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: TX }}>
          {rank}
        </span>
        <span style={LXS}>HORROR CREATORS</span>
        <span style={{ fontSize: 12, color: deltaColor ?? M, marginTop: 4, fontFamily: MONO }}>{delta}</span>
      </div>
      <div style={{ paddingTop: 26 }}>
        <SparkSVG data={[2,3,3,4,5,6,7,8,9,11,12,14]} width={110} height={36} stroke={A} />
      </div>
    </div>
  );
}

// ── Outperforming card with gold particle map ──
function OutperformingCard() {
  return (
    <div style={{
      ...surf({ padding: 0, overflow: "hidden" }),
      height: 160, position: "relative",
      background: "linear-gradient(135deg, #0d0b14 0%, #0f0c18 60%, #09080f 100%)",
    }}>
      {/* Gold particle glow backdrop */}
      <div style={{
        position: "absolute", right: -10, top: -10,
        width: 220, height: 180,
        background: `radial-gradient(ellipse at 60% 50%, ${A}12 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      {/* Gold particle map — right */}
      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", opacity: 0.9 }}>
        <GoldParticleArabWorld width={168} height={116} />
      </div>

      {/* Left-edge fade over map */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 140,
        background: "linear-gradient(to right, #0d0b14 40%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Text overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "18px 22px",
        gap: 6, zIndex: 2,
      }}>
        <span style={LXS}>Outperforming</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 56, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: A }}>
            82
          </span>
          <span style={{ fontFamily: SERIF, fontSize: 30, color: TX, fontWeight: 600 }}>%</span>
        </div>
        <span style={{ fontSize: 10.5, color: M, letterSpacing: "0.18em", fontFamily: MONO }}>OF ARAB CREATORS</span>
      </div>
    </div>
  );
}

function RankingsColumn({ kuwaitRank, gccRank, rankMovement, totalFollowers }: {
  kuwaitRank: number | null;
  gccRank: number | null;
  rankMovement: number | null;
  totalFollowers: number | null;
}) {
  const movLabel = rankMovement === null
    ? "No movement data yet"
    : rankMovement > 0
    ? `↑ ${rankMovement} this week`
    : rankMovement < 0
    ? `↓ ${Math.abs(rankMovement)} this week`
    : "No movement this week";
  const movColor = rankMovement && rankMovement > 0 ? UP : rankMovement && rankMovement < 0 ? DN : M;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <KuwaitHeroCard rank={`#${kuwaitRank ?? "—"}`} delta={movLabel} deltaColor={movColor} />
      <ArabWorldHeroCard rank={`#${gccRank ?? "—"}`} delta={movLabel} deltaColor={movColor} />
      <GenreRankCard rank="Top 1%" delta="Top performance category" deltaColor={A} />
      <OutperformingCard />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// KPI STRIP — 8 CARDS
// ─────────────────────────────────────────────────────────────────

function KPIStrip({
  totalFollowers,
  growth30dPct,
  growth7dPct,
  growth7dDelta,
  growth30dDelta,
  momentumScore,
  rankMovement,
  consistencyScore,
  isCalibrating = false,
}: {
  totalFollowers: number | null;
  growth30dPct: number | null;
  growth7dPct: number | null;
  growth7dDelta: number | null;
  growth30dDelta: number | null;
  momentumScore: number | null;
  rankMovement: number | null;
  consistencyScore: number | null;
  isCalibrating?: boolean;
}) {
  // Format a number or show "—" if unavailable
  function fmtOrDash(n: number | null): string {
    if (n === null) return "—";
    return fmtN(n);
  }
  function fmtPctOrDash(n: number | null): string {
    if (n === null) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  }

  const cards = [
    {
      label: "Total Followers",
      value: totalFollowers !== null ? fmtN(totalFollowers) : "—",
      delta: isCalibrating ? null : growth30dPct,
      custom: isCalibrating ? "Tracking Baseline" : null,
      spark: [10,11,12,11,13,14,13,15,16,17,18,19,20,21,22],
      noData: totalFollowers === null,
    },
    {
      label: "30-Day Growth",
      value: isCalibrating ? "—" : fmtPctOrDash(growth30dPct),
      delta: null,
      custom: isCalibrating
        ? "Calibration Active"
        : growth30dDelta !== null ? (growth30dDelta >= 0 ? `+${fmtN(growth30dDelta)}` : fmtN(growth30dDelta)) : "Not enough history",
      spark: [3,3,4,4,5,5,6,6,7,8,9,10,11,12,13],
      noData: isCalibrating || growth30dPct === null,
    },
    {
      label: "Weekly Growth",
      value: isCalibrating ? "—" : fmtPctOrDash(growth7dPct),
      delta: null,
      custom: isCalibrating
        ? "History Forming"
        : growth7dDelta !== null ? (growth7dDelta >= 0 ? `+${fmtN(growth7dDelta)}` : fmtN(growth7dDelta)) : "Not enough history",
      spark: [6,5,7,6,8,7,9,8,10,9,11,10,12,11,13],
      noData: isCalibrating || growth7dPct === null,
    },
    {
      label: "Momentum Score",
      value: isCalibrating ? "—" : momentumScore !== null ? String(momentumScore) : "—",
      delta: null,
      custom: isCalibrating
        ? "Calibration Active"
        : momentumScore !== null
          ? momentumScore >= 70 ? "Rising Fast" : momentumScore >= 50 ? "Building" : "Stable"
          : "Not enough history",
      spark: [60,62,64,63,66,68,70,72,75,77,79,82,84,86,88],
      noData: isCalibrating || momentumScore === null,
    },
    {
      label: "Rank Movement",
      value: isCalibrating ? "—" : rankMovement === null ? "—" : rankMovement > 0 ? `↑ ${rankMovement}` : rankMovement < 0 ? `↓ ${Math.abs(rankMovement)}` : "—",
      delta: null,
      custom: isCalibrating ? "Tracking Baseline" : rankMovement === null ? "Not enough history" : "This Week",
      spark: [3,4,3,5,4,6,7,6,8,7,9,10,9,11,12],
      noData: isCalibrating || rankMovement === null,
    },
    {
      label: "Activity Score",
      value: consistencyScore !== null ? `${consistencyScore}%` : "—",
      delta: null,
      custom: isCalibrating
        ? "History Forming"
        : consistencyScore === null ? "Not enough history" : "Active streamer",
      spark: [65,68,70,72,74,76,78,80,82,83,84,85,86,86,87],
      noData: consistencyScore === null,
    },
    {
      label: "Stream Consistency",
      value: "87%",
      delta: isCalibrating ? null : 6,
      custom: isCalibrating ? "Calibration Active" : null,
      spark: [65,68,70,72,74,76,78,80,82,83,84,85,86,86,87],
      noData: isCalibrating,
    },
    {
      label: "SAHA Fans",
      value: isCalibrating ? "—" : "312K",
      delta: isCalibrating ? null : 11.7,
      custom: isCalibrating ? "Tracking Baseline" : null,
      spark: [4,5,5,6,7,7,8,9,10,11,12,13,14,15,16],
      noData: isCalibrating,
    },
  ];

  return (
    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
      {cards.map(k => (
        <div key={k.label} style={surf({ padding: "14px 14px", height: 120, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, overflow: "hidden" })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
            <span style={{ ...LXS, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</span>
            {k.noData && <span style={{ fontSize: 9, color: M2, fontFamily: MONO, flexShrink: 0 }}>—</span>}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: k.noData ? M2 : TX }}>
            {k.value}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
            <div style={{ flex: 1, height: 22, overflow: "hidden", minWidth: 0 }}>
              <SparkSVG data={k.spark} width={90} height={22} stroke={k.noData ? M2 : A} />
            </div>
            {k.delta !== null
              ? <Delta value={k.delta} />
              : <span style={{ fontSize: 10, color: k.noData ? M2 : M, whiteSpace: "nowrap", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 72 }}>{k.custom}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CREATOR PERFORMANCE — GAME CARDS
// ─────────────────────────────────────────────────────────────────

// Twitch CDN boxart — public, no auth required
const TWITCH_BOXART: Record<string, string> = {
  "ARC Raiders":    "https://static-cdn.jtvnw.net/ttv-boxart/ARC%20Raiders-285x380.jpg",
  "Resident Evil 4": "https://static-cdn.jtvnw.net/ttv-boxart/Resident%20Evil%204-285x380.jpg",
  "Dark Souls III":  "https://static-cdn.jtvnw.net/ttv-boxart/Dark%20Souls%20III-285x380.jpg",
  "Minecraft":       "https://static-cdn.jtvnw.net/ttv-boxart/Minecraft-285x380.jpg",
};

const GAMES = [
  { title: "ARC Raiders",    avgViewers: "2.1K", growth: 18, dominance: 94 },
  { title: "Resident Evil 4", avgViewers: "3.7K", growth: 22, dominance: 96 },
  { title: "Dark Souls III",  avgViewers: "1.6K", growth: 11, dominance: 91 },
  { title: "Minecraft",       avgViewers: "1.2K", growth: 8,  dominance: 89 },
];

function GameCover({ title, palette }: { title: string; palette: [string, string] }) {
  const id = `gc-${title.replace(/\s+/g, "-")}`;
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 130" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette[0]} />
          <stop offset="100%" stopColor={palette[1]} />
        </linearGradient>
        <linearGradient id={`${id}-vig`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(11,10,18,0.85)" />
        </linearGradient>
        <pattern id={`${id}-st`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.04)" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="360" height="130" fill={`url(#${id})`} />
      <rect width="360" height="130" fill={`url(#${id}-st)`} />
      <circle cx="290" cy="55" r="50" fill="rgba(0,0,0,0.25)" />
      <circle cx="70" cy="110" r="65" fill="rgba(255,255,255,0.04)" />
      <rect width="360" height="130" fill={`url(#${id}-vig)`} />
      <text x="16" y="120" fontFamily={MONO} fontSize="9" fill="rgba(245,239,224,0.4)" letterSpacing="2">
        {title.toUpperCase()} · COVER
      </text>
    </svg>
  );
}

function CreatorPerformance() {
  return (
    <div style={surf({ padding: 22, marginTop: 18 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={LXS}>Creator Performance</span>
        <span style={{ fontSize: 11.5, color: M }}>Last 30 days · top categories</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {GAMES.map(g => (
          <div key={g.title} style={{ border: `1px solid ${BRD}`, borderRadius: 14, overflow: "hidden", background: SF }}>
            <div style={{ height: 130, position: "relative" }}>
              {/* Twitch boxart cover */}
              <img
                src={TWITCH_BOXART[g.title]}
                alt={g.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* Title + rank badge overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,10,18,0.55) 0%, transparent 50%, rgba(11,10,18,0.75) 100%)" }} />
              <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: TX, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{g.title}</span>
                <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", background: "rgba(11,10,18,0.7)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, fontSize: 10, color: M, fontFamily: MONO }}>
                  #{Math.round(100 - g.dominance / 2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LOCKED TEASER
// ─────────────────────────────────────────────────────────────────

function LockedTeaser({ isPro = false }: { isPro?: boolean }) {
  const items = ["Historical Rank", "Audience Migration", "Cohort Analysis", "Forecast Index"];
  return (
    <div style={{ ...surf({ marginTop: 18, height: 96, overflow: "hidden", padding: 0, position: "relative" }) }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", height: "100%" }}>
        {items.map((t, i) => (
          <div key={t} style={{
            padding: "18px 24px", borderRight: i < 3 ? `1px solid ${BS}` : "none",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <span style={LXS}>{t}</span>
            <div style={{ fontFamily: SERIF, fontSize: 28, color: M2 }}>━ ━ ━</div>
            <SparkSVG data={[3,4,5,6,5,7,8,7,9,10,11,12]} width={120} height={20} stroke={M2} />
          </div>
        ))}
      </div>
      {!isPro && (
        <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)", background: "linear-gradient(180deg, rgba(11,10,18,0.55), rgba(11,10,18,0.85))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: TX }}>
            <span style={{ fontSize: 15 }}>🔒</span>
            <span style={{ fontSize: 13.5, letterSpacing: "0.08em" }}>SAHA Analytics Pro · Historical &amp; cohort intelligence</span>
            <button style={{ height: 34, padding: "0 14px", background: "transparent", border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12.5, cursor: "pointer" }}>
              Unlock Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN ANALYTICS — CHART + PLATFORM TABLE
// ─────────────────────────────────────────────────────────────────

type ChartDay = { date: string; twitch?: number; instagram?: number; tiktok?: number; youtube?: number };

const CHART_SERIES = [
  { key: "twitch",    label: "Twitch",    color: "#9147ff" },
  { key: "instagram", label: "Instagram", color: "#e25555" },
  { key: "tiktok",    label: "TikTok",    color: "#5fb8d6" },
  { key: "youtube",   label: "YouTube",   color: "#cf6dab" },
] as const;

function ChartPanel({ chartData }: { chartData: ChartDay[] }) {
  const W = 860, H = 300, PL = 54, PR = 20, PT = 20, PB = 32;
  const IW = W - PL - PR, IH = H - PT - PB;

  const allVals = chartData.flatMap(d =>
    CHART_SERIES.map(s => (d as Record<string, number | string>)[s.key] as number ?? 0)
  ).filter(v => v > 0);
  const maxVal = Math.max(...allVals) * 1.12 || 1;
  const xStep = chartData.length > 1 ? IW / (chartData.length - 1) : IW;
  const yToPx = (v: number) => PT + IH - (v / maxVal) * IH;

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => Math.round((maxVal / (yTickCount - 1)) * i));

  const xLabelIdxs = [0, 7, 14, 21, 29].filter(i => i < chartData.length);

  return (
    <div style={surf({ padding: 22 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={LXS}>30-Day Growth</span>
        <div style={{ display: "flex", gap: 18 }}>
          {CHART_SERIES.map(s => (
            <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: M }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {/* Y grid + labels */}
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
        {/* X labels */}
        {xLabelIdxs.map(i => (
          <text key={i} x={PL + i * xStep} y={H - 8} fontSize={10} fill={M2} textAnchor="middle" fontFamily={MONO}>
            {chartData[i]?.date?.slice(5) ?? ""}
          </text>
        ))}
        {/* Series lines + end dots */}
        {CHART_SERIES.map(s => {
          const path = chartData.map((d, i) => {
            const v = (d as Record<string, number | string>)[s.key] as number ?? 0;
            return `${i === 0 ? "M" : "L"}${(PL + i * xStep).toFixed(1)},${yToPx(v).toFixed(1)}`;
          }).join(" ");
          const last = chartData[chartData.length - 1];
          const lastV = (last as Record<string, number | string>)[s.key] as number ?? 0;
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth={1.4} opacity={0.9} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={PL + (chartData.length - 1) * xStep} cy={yToPx(lastV)} r={2.5} fill={s.color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PlatformTable({ platforms }: { platforms: { id: string; followers: number; growth: number | null; sparkData: number[] }[] }) {
  const COLORS: Record<string, string> = {
    twitch: "#9147ff", instagram: "#e25555", tiktok: "#5fb8d6", youtube: "#cf6dab", kick: "#53FC18",
  };
  return (
    <div style={surf({ padding: 22, height: "100%" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={LXS}>Platform Performance</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["", "Followers", "Growth", "Trend"].map((h, i) => (
              <th key={h} style={{ textAlign: i === 3 ? "right" : "left", padding: "0 12px 10px", fontSize: 10.5, color: M, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: `1px solid ${BRD}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {platforms.map(p => {
            const color = COLORS[p.id] ?? M;
            return (
              <tr key={p.id} style={{ borderBottom: `1px solid ${BS}` }}>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 4, background: `${color}20`, border: `1px solid ${color}50`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontFamily: MONO, color, fontWeight: 700 }}>
                      {p.id.slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 13, color: TX, textTransform: "capitalize" }}>{p.id}</span>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontVariantNumeric: "tabular-nums", color: TX }}>{fmtN(p.followers)}</td>
                <td style={{ padding: "10px 12px" }}>{p.growth !== null ? <Delta value={p.growth} /> : <span style={{ color: M }}>—</span>}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <SparkSVG data={p.sparkData} width={84} height={20} stroke={color} />
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
// RANKING MOVEMENT
// ─────────────────────────────────────────────────────────────────

function RankingMovementSection() {
  const cells = [
    { value: "↑2",     caption: "Climbed Places This Week",  accent: true  },
    { value: "#3",     caption: "Gaming Creator Kuwait",      accent: false },
    { value: "Top 1%", caption: "Audience Loyalty",          accent: true  },
    { value: "8%",     caption: "Closing Gap with #7",       accent: false },
    { value: "82%",    caption: "Outperforming of Creators", accent: false },
  ];
  return (
    <div style={surf({ padding: "30px 28px", marginTop: 18 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <span style={LXS}>Ranking Movement</span>
        <span style={{ fontSize: 11.5, color: M, letterSpacing: "0.04em" }}>
          Updated 2 minutes ago · cohort: Gaming Creators · Kuwait
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
        {cells.map((c, i) => (
          <div key={i} style={{
            padding: "14px 22px", borderLeft: i > 0 ? `1px solid ${BS}` : "none",
            display: "flex", flexDirection: "column", gap: 12,
            minHeight: 110, justifyContent: "center", alignItems: "center", textAlign: "center",
          }}>
            <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 52, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", color: c.accent ? A : TX, whiteSpace: "nowrap" }}>
              {c.value}
            </span>
            <span style={{ fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: M, maxWidth: 180, lineHeight: 1.4 }}>
              {c.caption}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RIVALRY
// ─────────────────────────────────────────────────────────────────

function VsBar({ left, right, label, accent = false }: { left: number; right: number; label: string; accent?: boolean }) {
  const total = left + right || 1;
  const lp = (left / total) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 54, textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums", color: accent ? A : TX, fontWeight: accent ? 600 : 400 }}>
        {accent && left > 0 ? "+" : ""}{left}%
      </span>
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ fontSize: 10.5, color: M, textAlign: "center", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
        <div style={{ height: 3, background: BS, borderRadius: 2, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${lp}%`, background: A, opacity: 0.85 }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${100 - lp}%`, background: "rgba(167,160,184,0.4)" }} />
        </div>
      </div>
      <span style={{ width: 54, fontSize: 13, fontVariantNumeric: "tabular-nums", color: TX }}>{right}%</span>
    </div>
  );
}

function RivalrySection() {
  const left  = { name: "سبيكس",    handle: "@spiex",   score: 89, tone: "warm", init: "س" };
  const right = { name: "عزيزوز",   handle: "@Azizoz",  score: 87, tone: "plum", init: "ع" };
  return (
    <div style={surf({ padding: 24, height: "100%" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <span style={LXS}>Creator Rivalry</span>
        <span style={{ fontSize: 11.5, color: M }}>Head-to-Head · This Month</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 26, alignItems: "center" }}>
        {/* Left creator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <AvatarEl size={86} label={left.init} ring tone={left.tone} />
          <div style={{ fontFamily: ARABIC, fontSize: 22, fontWeight: 600, marginTop: 4, color: TX }}>{left.name}</div>
          <div style={{ fontSize: 12, color: M }}>{left.handle}</div>
          <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 600, lineHeight: 1, color: A, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{left.score}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: M2, fontFamily: MONO }}>SAHA SCORE</div>
        </div>

        {/* VS — center column */}
        <span style={{ fontFamily: SERIF, fontSize: 28, color: M2, letterSpacing: "0.08em", textAlign: "center", display: "block" }}>VS</span>

        {/* Right creator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <AvatarEl size={86} label={right.init} ring tone={right.tone} />
          <div style={{ fontFamily: ARABIC, fontSize: 22, fontWeight: 600, marginTop: 4, color: TX }}>{right.name}</div>
          <div style={{ fontSize: 12, color: M }}>{right.handle}</div>
          <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 600, lineHeight: 1, color: A, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{right.score}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: M2, fontFamily: MONO }}>SAHA SCORE</div>
        </div>
      </div>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <VsBar left={14} right={9}  label="Growth Velocity"  accent />
        <VsBar left={87} right={83} label="Consistency"             />
        <VsBar left={88} right={81} label="Momentum"                />
        <VsBar left={14} right={11} label="Rank Gap"                />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ALSO WATCHES
// ─────────────────────────────────────────────────────────────────

function AlsoWatches() {
  const creators = [
    { name: "AboFlah",    followers: "1.9M Followers", tone: "warm" },
    { name: "Ahmed Show", followers: "1.2M Followers", tone: "olive" },
    { name: "P4GAM3R",   followers: "986K Followers",  tone: "cool" },
  ];
  return (
    <div style={surf({ padding: 22 })}>
      <span style={{ ...LXS, display: "block", marginBottom: 12, lineHeight: 1.5 }}>
        Creators Your Audience<br />Also Watches
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
        {creators.map(c => (
          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AvatarEl size={32} label={c.name[0]} tone={c.tone} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, color: TX }}>{c.name}</span>
              <span style={{ fontSize: 11, color: M }}>{c.followers}</span>
            </div>
          </div>
        ))}
      </div>
      <button style={{ width: "100%", marginTop: 14, height: 32, justifyContent: "center", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: M, background: "transparent", border: `1px solid ${BRD}`, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center" }}>
        View Audience Map
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BADGE SHOWCASE
// ─────────────────────────────────────────────────────────────────

type BadgeKind = "founding"|"verified"|"top10"|"rising"|"elite"|"consistent"|"breakout";

function BadgeIcon({ kind }: { kind: BadgeKind }) {
  const icons: Record<BadgeKind, ReactNode> = {
    founding: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <polygon points="20,4 24,14 35,15 26,22 29,33 20,27 11,33 14,22 5,15 16,14" fill={`${A}18`} stroke={A} strokeWidth="1" />
        <text x="20" y="24" textAnchor="middle" fontFamily={SERIF} fontSize="11" fill={A} fontWeight="600">F</text>
      </svg>
    ),
    verified: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <path d="M20 4l4 3 5-1 2 4 4 2-1 5 2 5-3 4 1 5-5 1-3 4-5-2-5 2-3-4-5-1 1-5-3-4 2-5-1-5 4-2 2-4 5 1z" fill={`${A}10`} stroke={A} strokeWidth="1" />
        <path d="M14 21l4 4 8-9" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    ),
    top10: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <path d="M8 8h24v6l-6 6h2l4 6v6H8v-6l4-6h2l-6-6z" fill={`${A}12`} stroke={A} strokeWidth="1" />
        <text x="20" y="25" textAnchor="middle" fontFamily={SERIF} fontSize="10" fill={A} fontWeight="700">10</text>
      </svg>
    ),
    rising: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="14" fill="none" stroke={A} strokeWidth="1" opacity="0.6" />
        <path d="M14 26l5-7 4 4 6-8" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M24 15h6v6" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    ),
    elite: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <path d="M6 14l5-7 9 4 9-4 5 7-3 18H9z" fill={`${A}12`} stroke={A} strokeWidth="1" />
        <path d="M16 22l4 3 4-5" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    ),
    consistent: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="8" width="24" height="24" rx="2" fill="none" stroke={A} strokeWidth="1" opacity="0.7" />
        <path d="M10 24l5-3 4 2 4-5 4 1 3-3" stroke={A} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    ),
    breakout: (
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
        <path d="M20 6L26 14h-3v8l4 4 4-3-1 8-8 4-8-4-1-8 4 3 4-4v-8h-3z" fill={`${A}12`} stroke={A} strokeWidth="1" />
      </svg>
    ),
  };
  return icons[kind] ?? null;
}

const BADGES: { name: string; icon: BadgeKind; earned: boolean }[] = [
  { name: "Founding Creator", icon: "founding",   earned: true  },
  { name: "SAHA Verified",    icon: "verified",   earned: true  },
  { name: "Top 10 Kuwait",    icon: "top10",      earned: true  },
  { name: "Rising Creator",   icon: "rising",     earned: true  },
  { name: "SAHA Elite",       icon: "elite",      earned: false },
  { name: "Most Consistent",  icon: "consistent", earned: false },
  { name: "Breakout Creator", icon: "breakout",   earned: false },
];

function BadgeShowcase() {
  return (
    <div style={surf({ padding: 24, marginTop: 18 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={LXS}>Certifications · Badges</span>
        <span style={{ fontSize: 11.5, color: M }}>4 of 24 earned</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
        {BADGES.map(b => {
          const isFounding = b.icon === "founding";
          return (
            <div key={b.name} style={{
              padding: "20px 14px 16px",
              border: isFounding ? `1.5px solid ${A}` : `1px solid ${BRD}`,
              borderRadius: 12,
              background: `linear-gradient(180deg, ${A}06, transparent 50%), ${SF}`,
              boxShadow: isFounding ? `0 0 18px ${A}30, inset 0 0 18px ${A}10` : undefined,
              display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
              textAlign: "center", height: 132, justifyContent: "space-between",
              opacity: b.earned ? 1 : 0.35,
              filter: b.earned ? undefined : "grayscale(1)",
              position: "relative",
            }}>
              <div style={{
                width: 60, height: 72,
                background: `radial-gradient(60% 50% at 50% 35%, ${A}1a, transparent 70%), linear-gradient(180deg, #1a1727, #100e1a)`,
                border: `1px solid ${BRD}`, borderRadius: "8px 8px 30px 30px / 8px 8px 50px 50px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <BadgeIcon kind={b.icon} />
              </div>
              <span style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: M, fontWeight: 500, lineHeight: 1.3 }}>
                {b.name}
              </span>
              {!b.earned && (
                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 10, color: M2, fontFamily: MONO }}>🔒</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SAHA REPORT SUMMARY — editorial analyst notes (real signals only)
// ─────────────────────────────────────────────────────────────────

function SAHAReportSummary({
  momentumScore,
  rankMovement,
  platformCount,
  consistencyScore,
  growthAvailable,
}: {
  momentumScore: number | null;
  rankMovement: number | null;
  platformCount: number;
  consistencyScore: number | null;
  growthAvailable: boolean;
}) {
  const notes: { headline: string; body: string; tone: "up" | "neutral" | "muted" }[] = [];

  if (momentumScore !== null && momentumScore >= 70) {
    notes.push({ headline: "Strong momentum in Gaming", body: `Momentum score at ${momentumScore} — outperforming most peers in cohort.`, tone: "up" });
  } else if (momentumScore !== null) {
    notes.push({ headline: "Momentum building", body: `Current momentum score: ${momentumScore}. Tracking steady week-over-week.`, tone: "neutral" });
  } else {
    notes.push({ headline: "Momentum data pending", body: "Score will appear after 7 days of snapshot history.", tone: "muted" });
  }

  if (rankMovement !== null && rankMovement > 0) {
    notes.push({ headline: `Climbed ${rankMovement} ${rankMovement === 1 ? "place" : "places"} this week`, body: "Ranking trajectory positive across the Kuwait cohort.", tone: "up" });
  } else if (rankMovement !== null && rankMovement < 0) {
    notes.push({ headline: `Slipped ${Math.abs(rankMovement)} ${Math.abs(rankMovement) === 1 ? "place" : "places"}`, body: "Cohort competition intensified this week.", tone: "neutral" });
  } else {
    notes.push({ headline: "Ranking stable this week", body: "Position held against cohort movement.", tone: "neutral" });
  }

  notes.push({
    headline: `Cross-platform presence: ${platformCount} ${platformCount === 1 ? "platform" : "platforms"} active`,
    body: platformCount >= 3 ? "Diversified distribution improves discovery surface area." : "Expanding platform footprint may improve discovery.",
    tone: platformCount >= 3 ? "up" : "neutral",
  });

  if (consistencyScore !== null && consistencyScore >= 70) {
    notes.push({ headline: "Consistent streaming schedule detected", body: `Consistency score: ${consistencyScore}. Audience retention reinforced by predictable cadence.`, tone: "up" });
  } else if (consistencyScore !== null) {
    notes.push({ headline: "Streaming schedule irregular", body: `Consistency score: ${consistencyScore}. More regular streams may improve retention.`, tone: "neutral" });
  } else {
    notes.push({ headline: "Streaming schedule not synced", body: "Connect a streaming platform to track schedule consistency.", tone: "muted" });
  }

  if (!growthAvailable) {
    notes.push({ headline: "Growth data requires more history", body: "30-day growth signal becomes available after sufficient snapshot history.", tone: "muted" });
  }

  return (
    <div style={surf({ padding: 22, height: "100%" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={LXS}>SAHA Report · Analyst Notes</span>
        <span style={{ fontSize: 11.5, color: M }}>Auto-generated · 30 day window</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notes.map((n, i) => (
          <div key={i} style={{
            padding: "14px 16px",
            background: n.tone === "muted" ? "transparent" : SF,
            border: `1px solid ${n.tone === "up" ? `${A}40` : BRD}`,
            borderRadius: 10,
            display: "flex", flexDirection: "column", gap: 4,
            opacity: n.tone === "muted" ? 0.65 : 1,
          }}>
            <span style={{ fontFamily: SERIF, fontSize: 16, color: TX, fontWeight: 500, letterSpacing: "-0.005em" }}>
              {n.headline}
            </span>
            <span style={{ fontSize: 12.5, color: M, lineHeight: 1.55 }}>{n.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────

function LeaderboardSection({ creators, isCalibrating = false }: { creators: typeof mockAnalyticsData.topCreators; isCalibrating?: boolean }) {
  const momentum: Record<number, number[]> = {
    1: [4,5,5,6,6,7,7,8,8,9,10,11],
    2: [3,4,4,5,6,6,7,7,8,9,10,10],
    3: [2,3,3,4,5,7,8,9,10,11,12,14],
    4: [5,5,6,6,5,6,6,7,7,8,8,9],
    5: [3,4,5,5,6,7,7,8,9,10,11,12],
  };
  const maxScoreDelta = Math.max(...creators.filter(c => !c.you).map(c => c.scoreDelta ?? 0));
  const youRow = creators.find(c => c.you);
  const aboveYou = youRow ? creators.find(c => c.rank === (youRow.rank - 1)) : null;
  const gapPoints = (youRow && aboveYou) ? aboveYou.score - youRow.score : null;

  return (
    <div style={surf({ padding: 22, height: "100%" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={LXS}>Top Creators · Leaderboard</span>
        <div style={{ display: "flex", gap: 8 }}>
          {[["Region","Kuwait"],["Category","Gaming"],["Time","This Week"]].map(([l, v]) => (
            <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 30, padding: "0 10px 0 12px", background: SF, border: `1px solid ${BRD}`, borderRadius: 8, fontSize: 12, color: TX, cursor: "pointer" }}>
              <span style={{ color: M }}>{l}:</span>
              <span>{v}</span>
              <span style={{ color: M, fontSize: 10 }}>▾</span>
            </span>
          ))}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Rank","Creator","Score","Score Δ","Rank Δ","Momentum","Followers","30-D Growth"].map((h, i) => (
              <th key={h} style={{ textAlign: i === 7 ? "right" : "left", padding: "0 10px 10px", fontSize: 10.5, color: M, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: `1px solid ${BRD}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {creators.map(l => (
            <tr key={l.rank} style={{ background: l.you ? `${A}0d` : "transparent", borderBottom: `1px solid ${BS}` }}>
              <td style={{ padding: "10px 10px", fontFamily: SERIF, fontSize: 18, color: l.you ? A : M, fontVariantNumeric: "tabular-nums", fontWeight: l.you ? 600 : 400 }}>{l.rank}</td>
              <td style={{ padding: "10px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <AvatarEl size={26} label={l.name[0]} tone={l.you ? "warm" : "default"} ring={l.you} />
                  <span style={{ fontSize: 13.5, fontWeight: l.you ? 500 : 400, color: TX, fontFamily: l.arabic ? ARABIC : undefined }}>
                    {l.name}
                  </span>
                  {l.you && (
                    <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 6px", border: `1px solid ${A}`, borderRadius: 3, fontSize: 9, color: A }}>
                      YOU
                    </span>
                  )}
                  {l.you && isCalibrating && (
                    <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 6px", background: `${A}12`, border: `1px solid ${A}30`, borderRadius: 3, fontSize: 9, color: A, letterSpacing: "0.08em", fontFamily: MONO }}>
                      CALIBRATING
                    </span>
                  )}
                  {!l.you && l.scoreDelta >= 6 && (
                    <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 6px", border: `1px solid ${UP}`, color: UP, borderRadius: 3, fontSize: 9, letterSpacing: "0.1em", fontFamily: MONO }}>HOT</span>
                  )}
                  {!l.you && l.rankDelta > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 6px", border: `1px solid ${A}`, color: A, borderRadius: 3, fontSize: 9, letterSpacing: "0.1em", fontFamily: MONO }}>RISING</span>
                  )}
                  {!l.you && l.scoreDelta === maxScoreDelta && maxScoreDelta > 0 && (
                    <span style={{ fontSize: 10, color: A, fontFamily: MONO, letterSpacing: "0.06em" }}>Fastest · KW</span>
                  )}
                </div>
              </td>
              <td style={{ padding: "10px 10px", fontFamily: SERIF, fontSize: 18, fontVariantNumeric: "tabular-nums", color: l.you ? A : TX, fontWeight: l.you ? 600 : 400 }}>{l.score}</td>
              <td style={{ padding: "10px 10px" }}><span style={{ fontSize: 14 }}><Delta value={l.scoreDelta} suffix="" /></span></td>
              <td style={{ padding: "10px 10px" }}>
                {l.rankDelta === 0
                  ? <span style={{ color: M2 }}>—</span>
                  : <span style={{ fontSize: 14 }}><Delta value={l.rankDelta} suffix="" /></span>}
              </td>
              <td style={{ padding: "10px 10px" }}><SparkSVG data={momentum[l.rank] ?? []} width={90} height={20} stroke={l.you ? A : M} /></td>
              <td style={{ padding: "10px 10px", fontSize: 13, fontVariantNumeric: "tabular-nums", color: TX }}>{l.followers}</td>
              <td style={{ padding: "10px 10px", textAlign: "right" }}><span style={{ fontSize: 14 }}><Delta value={l.growth} /></span></td>
            </tr>
          ))}
        </tbody>
        {gapPoints !== null && aboveYou && gapPoints > 0 && (
          <tfoot>
            <tr>
              <td colSpan={8} style={{ padding: "12px 10px 0", fontSize: 11.5, color: A, fontFamily: MONO, letterSpacing: "0.08em" }}>
                Only {gapPoints} {gapPoints === 1 ? "point" : "points"} behind #{aboveYou.rank} · {aboveYou.name}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LOCKED ANALYTICS BLOCK
// ─────────────────────────────────────────────────────────────────

function LockedAnalyticsBlock({ isPro = false }: { isPro?: boolean }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...surf({ padding: 0, height: 220, position: "relative", overflow: "hidden" }) }}>
        <div style={{ padding: 22 }}>
          <span style={LXS}>Advanced Growth Insights</span>
          <div style={{ marginTop: 16, height: 150, opacity: isPro ? 1 : 0.4 }}>
            <SparkSVG data={[5,8,6,10,7,12,9,14,11,16,12,17,13,19,15,21,16,23,18,25]} width={900} height={150} stroke={isPro ? A : M2} fill />
          </div>
        </div>
        {!isPro && (
          <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)", background: "linear-gradient(180deg, rgba(11,10,18,0.55), rgba(11,10,18,0.85))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: 420, textAlign: "center" }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: TX }}>SAHA Analytics Pro</div>
              <div style={{ fontSize: 12.5, color: M, lineHeight: 1.6 }}>
                Unlock historical ranking intelligence, advanced growth tracking, and creator comparison tools.
              </div>
              <button style={{ marginTop: 4, height: 34, padding: "0 14px", background: "transparent", border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12.5, cursor: "pointer" }}>
                Subscribe to Pro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <div style={{ marginTop: 56, padding: "32px 0 56px", borderTop: `1px solid ${BRD}`, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: TX }}>SAHA</span>
          <span style={{ fontFamily: ARABIC, fontSize: 16, color: A }}>سَاحة</span>
        </div>
        <span style={{ fontSize: 11.5, color: M, letterSpacing: "0.04em" }}>
          Public ranking infrastructure for the Arab creator economy.
        </span>
      </div>
      <div style={{ display: "flex", gap: 28, fontSize: 11.5, color: M2, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {["About", "Methodology", "API", "Press", "Privacy"].map(l => (
          <span key={l} style={{ cursor: "pointer" }}>{l}</span>
        ))}
        <span style={{ color: M }}>© 2026 SAHA</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────────────

type SnapshotRow = { platform: string; followers: number; snapshot_date: string };

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch subscription tier for this user
  const { data: userRow } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = (userRow as { subscription_tier?: string } | null)?.subscription_tier === "pro";

  const CREATOR_HANDLE = "spiex";

  const { data: creatorRaw } = await supabase
    .from("creators")
    .select("*, platforms:creator_platforms(*), score:creator_scores(*), indexed_at, calibration_ends_at, calibration_completed_at")
    .eq("handle", CREATOR_HANDLE)
    .maybeSingle();

  const creator = creatorRaw as unknown as CreatorWithStats;
  const creatorId = creatorRaw?.id as string | null ?? null;
  const cRow = creatorRaw as { indexed_at?: string | null; calibration_ends_at?: string | null; calibration_completed_at?: string | null; created_at?: string | null } | null;

  // ── Real analytics data ─────────────────────────────────────────
  type DailyScoreRow = {
    saha_score: number;
    growth_score: number;
    momentum_score: number;
    consistency_score: number;
    presence_score: number;
    rank_score: number;
    rank_country: number | null;
    rank_arab_world: number | null;
    rank_genre: number | null;
    calculated_date: string;
  };
  type RankSnapRow = {
    rank_country: number | null;
    rank_arab_world: number | null;
    snapshot_date: string;
  };
  type GrowthDbRow = { period: string; followers_start: number; followers_end: number };

  const today = new Date().toISOString().slice(0, 10);
  const d30   = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [
    { data: dailyScoreRaw },
    { data: prevSnapRaw },
    { data: growthRaw },
    { data: snapshotRaw },
  ] = await Promise.all([
    creatorId
      ? supabase
          .from("creator_daily_scores")
          .select("saha_score,growth_score,momentum_score,consistency_score,presence_score,rank_score,rank_country,rank_arab_world,rank_genre,calculated_date")
          .eq("creator_id", creatorId)
          .lte("calculated_date", today)
          .order("calculated_date", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    creatorId
      ? supabase
          .from("creator_rank_snapshots")
          .select("rank_country,rank_arab_world,snapshot_date")
          .eq("creator_id", creatorId)
          .lte("snapshot_date", new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    creatorId
      ? supabase
          .from("creator_growth")
          .select("period,followers_start,followers_end")
          .eq("creator_id", creatorId)
          .in("period", ["7d", "30d"])
      : Promise.resolve({ data: [] }),

    creatorId
      ? supabase
          .from("creator_snapshots")
          .select("platform,followers,snapshot_date")
          .eq("creator_id", creatorId)
          .gte("snapshot_date", d30)
          .lte("snapshot_date", today)
          .order("snapshot_date", { ascending: true })
          .limit(300)
      : Promise.resolve({ data: [] }),
  ]);

  const dailyScore = dailyScoreRaw as DailyScoreRow | null;
  const prevSnap   = prevSnapRaw as RankSnapRow | null;

  // ── Followers ──────────────────────────────────────────────────
  type PlatformRow = { platform: string; followers?: number };
  const platforms      = (creator?.platforms ?? []) as PlatformRow[];
  const totalFollowers = platforms.reduce((s, p) => s + (p.followers ?? 0), 0);

  // ── Growth % ───────────────────────────────────────────────────
  const growthList = (growthRaw ?? []) as GrowthDbRow[];
  const g30 = growthList.find(g => g.period === "30d");
  const g7  = growthList.find(g => g.period === "7d");
  const growth30dPct = g30?.followers_start
    ? ((g30.followers_end - g30.followers_start) / g30.followers_start) * 100
    : null;
  const growth7dPct = g7?.followers_start
    ? ((g7.followers_end - g7.followers_start) / g7.followers_start) * 100
    : null;
  const growth7dDelta  = g7  ? g7.followers_end  - g7.followers_start  : null;
  const growth30dDelta = g30 ? g30.followers_end - g30.followers_start : null;

  // ── Ranks ──────────────────────────────────────────────────────
  const kuwaitRank = dailyScore?.rank_country ?? null;
  const arabRank   = dailyScore?.rank_arab_world ?? null;
  const prevKuwaitRank = prevSnap?.rank_country ?? null;
  const rankMovement   = (kuwaitRank && prevKuwaitRank) ? prevKuwaitRank - kuwaitRank : null;

  // ── SAHA Score ─────────────────────────────────────────────────
  // Use daily_scores if available, fall back to legacy score
  const sahaScore = dailyScore
    ? Math.round(Number(dailyScore.saha_score))
    : Math.round(Number(creator?.score?.final_score ?? 0));

  const momentumScore = dailyScore ? Math.round(Number(dailyScore.momentum_score)) : null;
  const consistencyScore = dailyScore ? Math.round(Number(dailyScore.consistency_score)) : null;
  const platformCount = platforms.filter(p => (p.followers ?? 0) > 0).length;
  const growthAvailable = growth30dPct !== null;

  // ── Calibration detection ──────────────────────────────────────
  // A creator is "calibrating" when:
  //   - They haven't yet completed 7 days of growth history, AND
  //   - Their calibration window hasn't expired
  const hasGrowthHistory = growthList.some(g => g.period === "7d" || g.period === "30d");
  const snapshotDays = new Set(((snapshotRaw ?? []) as SnapshotRow[]).map((s) => s.snapshot_date)).size;

  const indexedAt = cRow?.indexed_at
    ? new Date(cRow.indexed_at)
    : cRow?.created_at ? new Date(cRow.created_at) : null;

  const calibrationEndsAt = cRow?.calibration_ends_at
    ? new Date(cRow.calibration_ends_at)
    : indexedAt ? new Date(indexedAt.getTime() + 7 * 86400000) : null;

  // calibration_completed_at overrides everything — if set, never show calibration UI
  const isCalibrating = !cRow?.calibration_completed_at && (
    calibrationEndsAt
      ? Date.now() < calibrationEndsAt.getTime() && !hasGrowthHistory
      : snapshotDays < 7
  );

  const msRemaining = calibrationEndsAt
    ? Math.max(0, calibrationEndsAt.getTime() - Date.now())
    : null;
  const daysRemaining    = msRemaining !== null ? Math.floor(msRemaining / 86400000) : null;
  const hoursRemaining   = msRemaining !== null ? Math.floor((msRemaining % 86400000) / 3600000) : null;
  const minutesRemaining = msRemaining !== null ? Math.floor((msRemaining % 3600000) / 60000) : null;

  // Projected score range: use available sub-scores to estimate
  function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
  const presenceBase  = dailyScore ? Number(dailyScore.presence_score) : platformCount >= 3 ? 70 : platformCount >= 2 ? 55 : 35;
  const projectedBase = Math.round((presenceBase + 50) / 2); // conservative midpoint
  const projectedLow  = clamp(projectedBase, 35, 82);
  const projectedHigh = clamp(projectedLow + 14, 45, 96);

  // Calibration pillars — show what we CAN compute
  const calibrationPillars = [
    { k: "Presence",    v: dailyScore ? Math.round(Number(dailyScore.presence_score)) : "—" },
    { k: "Growth",      v: "—" },
    { k: "Momentum",    v: "—" },
    { k: "Consistency", v: "—" },
    { k: "Rank",        v: "—" },
  ];

  // ── Chart data from snapshots ──────────────────────────────────
  const snapshotList = (snapshotRaw ?? []) as SnapshotRow[];
  const dateMap = new Map<string, Record<string, number>>();
  for (const s of snapshotList) {
    if (!dateMap.has(s.snapshot_date)) dateMap.set(s.snapshot_date, {});
    dateMap.get(s.snapshot_date)![s.platform] = s.followers;
  }
  const chartDataReal = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  // Use real chart data if available, otherwise fall through to mock
  type ChartRow = { date: string; twitch: number; instagram: number; tiktok: number; youtube: number };
  const chartData: ChartRow[] = chartDataReal.length >= 5
    ? chartDataReal.map(row => {
        const r = row as Record<string, unknown>;
        return {
          date:      String(r.date ?? ""),
          twitch:    Number(r.twitch    ?? 0),
          instagram: Number(r.instagram ?? 0),
          tiktok:    Number(r.tiktok    ?? 0),
          youtube:   Number(r.youtube   ?? 0),
        };
      })
    : mockAnalyticsData.chartData;

  // ── Platform performance ───────────────────────────────────────
  const PLATFORM_ORDER = ["twitch", "instagram", "tiktok", "youtube", "kick"];
  const platformPerformance = PLATFORM_ORDER
    .map(id => {
      const p = platforms.find(pl => pl.platform === id);
      if (!p || !p.followers) return null;
      return {
        id,
        followers: p.followers ?? 0,
        growth: growth30dPct ?? null,
        sparkData: mockAnalyticsData.platformPerformance.find(pp => pp.id === id)?.sparkData ?? [],
      };
    })
    .filter(Boolean) as typeof mockAnalyticsData.platformPerformance;

  // Use real if we have platform data, fallback to mock
  const platformData = platformPerformance.length > 0
    ? platformPerformance
    : mockAnalyticsData.platformPerformance;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0A12" }}>
      <HeaderAnalytics />
      <main style={{ maxWidth: 1680, margin: "0 auto", padding: "0 48px 48px", position: "relative", zIndex: 1 }}>

        <PageHeader name={creator?.name_en ?? "Spiex"} />

        {/* Calibration strip */}
        {isCalibrating && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14, height: 32 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              height: 22, padding: "0 10px",
              background: `${A}10`, border: `1px solid ${A}35`,
              borderRadius: 4, fontSize: 10.5, color: A, fontFamily: MONO, letterSpacing: "0.14em",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: A, display: "inline-block", opacity: 0.85 }} />
              CALIBRATION PERIOD ACTIVE
            </span>
          </div>
        )}

        {/* Hero — 3 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,40fr) minmax(0,30fr) minmax(0,30fr)", gap: 32, marginTop: 36 }}>
          <IdentityColumn creator={creator} />
          {isCalibrating ? (
            <CalibrationRing
              projectedLow={projectedLow}
              projectedHigh={projectedHigh}
              msRemaining={msRemaining}
              daysRemaining={daysRemaining}
              hoursRemaining={hoursRemaining}
              minutesRemaining={minutesRemaining}
              pillars={calibrationPillars}
              isPublic={false}
            />
          ) : (
            <CenterColumn
              score={sahaScore > 0 ? sahaScore : 89}
              momentumScore={momentumScore}
              rankMovement={rankMovement}
              kuwaitRank={kuwaitRank}
            />
          )}
          <RankingsColumn
            kuwaitRank={kuwaitRank ?? 8}
            gccRank={arabRank ?? 21}
            rankMovement={rankMovement}
            totalFollowers={totalFollowers > 0 ? totalFollowers : null}
          />
        </div>

        <KPIStrip
          totalFollowers={totalFollowers > 0 ? totalFollowers : null}
          growth30dPct={growth30dPct}
          growth7dPct={growth7dPct}
          growth7dDelta={growth7dDelta}
          growth30dDelta={growth30dDelta}
          momentumScore={momentumScore}
          rankMovement={rankMovement}
          consistencyScore={consistencyScore}
          isCalibrating={isCalibrating}
        />
        <CreatorPerformance />
        <LockedTeaser isPro={isPro} />

        {/* Main analytics */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "65% 35%", gap: 18 }}>
          <ChartPanel chartData={chartData} />
          <PlatformTable platforms={platformData} />
        </div>

        <RankingMovementSection />

        {/* Prestige first — badges before upsell */}
        <BadgeShowcase />

        {/* SAHA Report + Leaderboard */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 18 }}>
          <SAHAReportSummary
            momentumScore={momentumScore}
            rankMovement={rankMovement}
            platformCount={platformCount}
            consistencyScore={consistencyScore}
            growthAvailable={growthAvailable}
          />
          <LeaderboardSection creators={mockAnalyticsData.topCreators} isCalibrating={isCalibrating} />
        </div>

        {/* Rivalry + Also Watches — locked sections after prestige content */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18 }}>
          <RivalrySection />
          <AlsoWatches />
        </div>

        <LockedAnalyticsBlock isPro={isPro} />
        <Footer />
      </main>
    </div>
  );
}
