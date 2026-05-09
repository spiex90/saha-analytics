/**
 * Public Creator Profile
 *
 * Mirrors the analytics dashboard (app/dashboard/analytics/page.tsx)
 * exactly — same components, same layout, same design tokens.
 * Fetches by handle from URL params. No auth gate.
 */

import type { ReactNode } from "react";
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
// PRIMITIVE HELPERS
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

function KuwaitMapSVG({ accent = false }: { accent?: boolean }) {
  return (
    <svg width={90} height={70} viewBox="0 0 100 80">
      <path d="M30 8 L62 6 L78 18 L86 28 L82 42 L74 50 L78 62 L70 70 L52 72 L40 66 L24 60 L18 50 L14 36 L20 22 Z"
        fill={accent ? "rgba(244,165,44,0.10)" : "rgba(167,160,184,0.06)"}
        stroke={accent ? "rgba(244,165,44,0.55)" : "rgba(167,160,184,0.35)"}
        strokeWidth="1" />
      <circle cx="48" cy="40" r="2" fill={accent ? A : M} />
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
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────

function PageHeader({ name, isLive }: { name: string; isLive: boolean }) {
  return (
    <div style={{ marginTop: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={LXS}>Creator Profile</span>
        <h1 style={{ margin: 0, fontSize: 36, fontWeight: 500, letterSpacing: "-0.01em", fontFamily: SERIF, color: TX }}>
          {name}
        </h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {isLive && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", border: `1px solid ${BRD}`, borderRadius: 4, fontSize: 11, color: TX }}>
            <span className="live-dot-v2" style={{ width: 6, height: 6, borderRadius: "50%", background: "#e25555", display: "inline-block" }} />
            LIVE NOW
          </span>
        )}
        <button style={{ height: 34, padding: "0 14px", background: "transparent", border: `1px solid ${BRD}`, borderRadius: 8, color: TX, fontSize: 12.5, cursor: "pointer" }}>
          Share Profile
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// IDENTITY COLUMN
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

interface CreatorData {
  handle: string;
  name_en: string;
  name_ar: string;
  country_code: string;
  genres: string[];
  is_live: boolean;
  is_verified: boolean;
  avatar_url: string | null;
  platforms: CreatorPlatformEntry[];
}

function IdentityColumn({ creator }: { creator: CreatorData }) {
  const country = getCountry(creator.country_code ?? "KW");
  const platforms = (creator.platforms ?? []).slice(0, 6);

  const dna = [
    { k: "Signature Genre", tags: creator.genres?.slice(0, 2) ?? ["Gaming"] },
    { k: "Audience Type",   tags: ["Core Gamers", "18–34"] },
    { k: "Stream Persona",  tags: ["Intense", "Humorous"] },
    { k: "Viewer Loyalty",  tags: ["Very High", "Top 12%"] },
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
          {creator.avatar_url ? (
            <div style={{ width: 108, height: 108, flexShrink: 0, borderRadius: "50%", padding: 2, background: "linear-gradient(180deg, rgba(244,165,44,0.85), rgba(244,165,44,0.2))" }}>
              <img src={creator.avatar_url} width={104} height={104} alt={creator.name_en}
                style={{ borderRadius: "50%", objectFit: "cover", display: "block", width: 104, height: 104 }} />
            </div>
          ) : (
            <AvatarEl size={108} label={(creator.handle ?? "S").slice(0, 1).toUpperCase()} tone="warm" ring />
          )}

          {/* Name + meta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, flex: 1 }}>
            {/* Name row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: ARABIC, fontSize: 36, fontWeight: 600, lineHeight: 1, color: TX }}>
                  {creator.name_ar || creator.name_en || creator.handle}
                </span>
                {creator.is_verified && <VerifiedBadge />}
              </div>
              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  height: 36, padding: "0 14px",
                  background: "transparent", border: `1.5px solid ${A}`,
                  borderRadius: 8, cursor: "pointer", color: TX, fontSize: 13,
                  fontFamily: ARABIC, direction: "rtl", whiteSpace: "nowrap",
                }}>
                  <span style={{ color: A, fontSize: 12, fontFamily: MONO }}>—</span>
                  <span>متابع</span>
                </button>
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
              <span>@{creator.handle}</span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: M2, display: "inline-block" }} />
              <span>{country?.flag} {country?.name_en ?? creator.country_code}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {[["✦", "SAHA Elite"], ["★", `Top 1% ${country?.name_en ?? ""}`], ["⟳", "Synchronized"]].map(([ic, label], idx) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 27, padding: "0 11px", background: EL, border: `1px solid ${BRD}`, borderRadius: 999, fontSize: 11.5, color: idx === 2 ? M : TX }}>
                  <span style={{ color: A, fontSize: 10 }}>{ic}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Platform grid */}
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
// CENTER COLUMN (SCORE RING)
// ─────────────────────────────────────────────────────────────────

function CenterColumn({ score, momentumScore }: { score: number; momentumScore: number | null }) {
  const size = 320;
  const radius = size / 2 - 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const scoreLabel = score >= 85 ? "ELITE" : score >= 70 ? "EXCELLENT" : score >= 55 ? "STRONG" : "BUILDING";

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
    { k: "Loyalty",     v: 91, data: [6,5,7,6,8,7,9,8,10,9]  },
    { k: "Engagement",  v: 87, data: [5,6,5,7,6,8,7,9,8,10]  },
    { k: "Momentum",    v: 88, data: [4,5,4,6,5,7,8,9,10,11] },
    { k: "Consistency", v: 90, data: [7,6,8,7,9,8,9,8,9,10]  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Score ring card */}
      <div style={surf({ padding: 26, display: "flex", flexDirection: "column" })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={LXS}>SAHA Score Index</span>
          <span style={{ fontSize: 10.5, letterSpacing: "0.18em", color: M2, fontFamily: MONO }}>OFFICIAL · CERTIFIED</span>
        </div>

        {/* Ring */}
        <div style={{ position: "relative", width: size, margin: "0 auto", height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
            {ticks.map((t, i) => (
              <line key={i} x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)} x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)}
                stroke={t.long ? "rgba(245,239,224,0.18)" : "rgba(245,239,224,0.07)"}
                strokeWidth={t.long ? 1.2 : 0.8} />
            ))}
          </svg>

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
            <span style={{ fontFamily: SERIF, fontSize: 88, lineHeight: 0.95, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX }}>
              {score}
            </span>
            <span style={{ fontSize: 12.5, letterSpacing: "0.32em", color: A, marginTop: 8, fontFamily: MONO }}>{scoreLabel}</span>
            <span style={{ fontSize: 12, color: UP, marginTop: 8, fontFamily: MONO }}>↑ +7 this month</span>
          </div>
        </div>

        {/* Sub-pillars */}
        <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${BS}`, marginTop: 18 }}>
          {pillars.map((p, idx) => (
            <div key={p.k} style={{
              flex: 1, padding: "16px 0 18px", textAlign: "center",
              borderRight: idx < pillars.length - 1 ? `1px solid ${BS}` : "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10.5, color: M, letterSpacing: "0.04em" }}>{p.k}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 13, height: 13, borderRadius: "50%", border: `1px solid ${M2}`,
                  fontSize: 9, color: M2, fontStyle: "italic", fontFamily: "Georgia, serif",
                  lineHeight: 1, flexShrink: 0,
                }}>i</span>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: TX, lineHeight: 1 }}>{p.v}</div>
              <SparkSVG data={p.data} width={64} height={18} stroke={A} />
            </div>
          ))}
        </div>
      </div>

      {/* Momentum panel */}
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
// RANKINGS COLUMN
// ─────────────────────────────────────────────────────────────────

function RankCard({ rank, delta, deltaColor, type, sub, big = true }: {
  rank: string; delta: string; deltaColor?: string; type: "kuwait" | "arab" | "line"; sub: string; big?: boolean;
}) {
  return (
    <div style={surf({ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18, height: 124 })}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
        <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: big ? 56 : 38, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: TX }}>
          {rank}
        </span>
        <span style={LXS}>{sub}</span>
        <span style={{ fontSize: 12, color: deltaColor ?? M, marginTop: 4, fontFamily: MONO }}>{delta}</span>
      </div>
      <div style={{ width: 110, height: 70, opacity: 0.95, display: "flex", alignItems: "center" }}>
        {type === "kuwait" && <KuwaitMapSVG accent />}
        {type === "arab"   && <ArabWorldSVG />}
        {type === "line"   && <div style={{ paddingTop: 26 }}><SparkSVG data={[2,3,3,4,5,6,7,8,9,11,12,14]} width={110} height={36} stroke={A} /></div>}
      </div>
    </div>
  );
}

function OutperformingCard() {
  return (
    <div style={surf({ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18, height: 124 })}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
        <span style={LXS}>Outperforming</span>
        <span style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 56, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: A }}>
          82<span style={{ fontSize: 30, color: TX }}>%</span>
        </span>
        <span style={{ fontSize: 10.5, color: M, letterSpacing: "0.18em", fontFamily: MONO }}>OF CREATORS</span>
      </div>
      <div style={{ width: 130, height: 80 }}>
        <DottedMapSVG width={130} height={80} />
      </div>
    </div>
  );
}

function RankingsColumn({ kuwaitRank, gccRank, rankMovement }: {
  kuwaitRank: number | null;
  gccRank: number | null;
  rankMovement: number | null;
}) {
  const movLabel = rankMovement === null ? "No movement data yet"
    : rankMovement > 0 ? `↑ ${rankMovement} this week`
    : rankMovement < 0 ? `↓ ${Math.abs(rankMovement)} this week`
    : "No movement this week";
  const movColor = rankMovement && rankMovement > 0 ? UP : rankMovement && rankMovement < 0 ? DN : M;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <RankCard rank={`#${kuwaitRank ?? "—"}`} delta={movLabel} deltaColor={movColor} type="kuwait" sub="IN KUWAIT" big />
      <RankCard rank={`#${gccRank ?? "—"}`}    delta={movLabel} deltaColor={movColor} type="arab"   sub="IN ARAB WORLD" big />
      <RankCard rank="Top 1%"                  delta="Top performance category" type="line" sub="HORROR CREATORS" big={false} />
      <OutperformingCard />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// KPI STRIP
// ─────────────────────────────────────────────────────────────────

function KPIStrip({
  totalFollowers, growth30dPct, growth7dPct,
  growth7dDelta, growth30dDelta, momentumScore, rankMovement,
}: {
  totalFollowers: number | null;
  growth30dPct: number | null;
  growth7dPct: number | null;
  growth7dDelta: number | null;
  growth30dDelta: number | null;
  momentumScore: number | null;
  rankMovement: number | null;
}) {
  function fmtPctOrDash(n: number | null) {
    if (n === null) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  }

  const cards = [
    { label: "Total Followers",    value: totalFollowers !== null ? fmtN(totalFollowers) : "—",  delta: growth30dPct, custom: null, spark: [10,11,12,11,13,14,13,15,16,17,18,19,20,21,22], noData: totalFollowers === null },
    { label: "30-Day Growth",      value: fmtPctOrDash(growth30dPct),  delta: null, custom: growth30dDelta !== null ? `${growth30dDelta >= 0 ? "+" : ""}${fmtN(growth30dDelta)}` : "Not enough history", spark: [3,3,4,4,5,5,6,6,7,8,9,10,11,12,13], noData: growth30dPct === null },
    { label: "Weekly Growth",      value: fmtPctOrDash(growth7dPct),   delta: null, custom: growth7dDelta !== null ? `${growth7dDelta >= 0 ? "+" : ""}${fmtN(growth7dDelta)}` : "Not enough history",  spark: [6,5,7,6,8,7,9,8,10,9,11,10,12,11,13], noData: growth7dPct === null },
    { label: "Momentum Score",     value: momentumScore !== null ? String(momentumScore) : "—",  delta: null, custom: momentumScore !== null ? momentumScore >= 70 ? "Rising Fast" : momentumScore >= 50 ? "Building" : "Stable" : "Not enough history", spark: [60,62,64,63,66,68,70,72,75,77,79,82,84,86,88], noData: momentumScore === null },
    { label: "Rank Movement",      value: rankMovement === null ? "—" : rankMovement > 0 ? `↑ ${rankMovement}` : rankMovement < 0 ? `↓ ${Math.abs(rankMovement)}` : "—", delta: null, custom: rankMovement === null ? "Not enough history" : "This Week", spark: [3,4,3,5,4,6,7,6,8,7,9,10,9,11,12], noData: rankMovement === null },
    { label: "Viewer Loyalty",     value: "92%",  delta: 5,  custom: null, spark: [70,72,74,75,77,79,80,82,84,85,87,88,90,91,92], noData: false },
    { label: "Stream Consistency", value: "87%",  delta: 6,  custom: null, spark: [65,68,70,72,74,76,78,80,82,83,84,85,86,86,87], noData: false },
    { label: "SAHA Fans",          value: "312K", delta: 11.7, custom: null, spark: [4,5,5,6,7,7,8,9,10,11,12,13,14,15,16], noData: false },
  ];

  return (
    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
      {cards.map(k => (
        <div key={k.label} style={surf({ padding: "14px 14px", height: 120, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, overflow: "hidden" })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
            <span style={{ ...LXS, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</span>
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
              : <span style={{ fontSize: 10, color: k.noData ? M2 : M, whiteSpace: "nowrap", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 72 }}>{k.custom}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CREATOR PERFORMANCE (GAME CARDS)
// ─────────────────────────────────────────────────────────────────

const TWITCH_BOXART: Record<string, string> = {
  "ARC Raiders":     "https://static-cdn.jtvnw.net/ttv-boxart/ARC%20Raiders-285x380.jpg",
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

function CreatorPerformance() {
  return (
    <div style={surf({ padding: 22, marginTop: 18 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={LXS}>Creator Performance</span>
        <span style={{ fontSize: 11.5, color: M }}>Last 30 days · sorted by dominance</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {GAMES.map(g => (
          <div key={g.title} style={{ border: `1px solid ${BRD}`, borderRadius: 14, overflow: "hidden", background: SF }}>
            <div style={{ height: 130, position: "relative" }}>
              <img src={TWITCH_BOXART[g.title]} alt={g.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,10,18,0.55) 0%, transparent 50%, rgba(11,10,18,0.75) 100%)" }} />
              <div style={{ position: "absolute", top: 12, left: 14, right: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: TX, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{g.title}</span>
                <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", background: "rgba(11,10,18,0.7)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 3, fontSize: 10, color: M, fontFamily: MONO }}>
                  #{Math.round(100 - g.dominance / 2)}
                </span>
              </div>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, color: M }}>Avg Viewers</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, color: TX, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{g.avgViewers}</span>
                  <Delta value={g.growth} />
                </div>
              </div>
              <div style={{ height: 1, background: BS }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, color: M }}>Dominance</span>
                <span style={{ fontSize: 14, color: A, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{g.dominance}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// CHART + PLATFORM TABLE
// ─────────────────────────────────────────────────────────────────

type ChartRow = { date: string; twitch: number; instagram: number; tiktok: number; youtube: number };

const CHART_SERIES = [
  { key: "twitch",    label: "Twitch",    color: "#9147ff" },
  { key: "instagram", label: "Instagram", color: "#e25555" },
  { key: "tiktok",    label: "TikTok",    color: "#5fb8d6" },
  { key: "youtube",   label: "YouTube",   color: "#cf6dab" },
] as const;

function ChartPanel({ chartData }: { chartData: ChartRow[] }) {
  const W = 860, H = 300, PL = 54, PR = 20, PT = 20, PB = 32;
  const IW = W - PL - PR, IH = H - PT - PB;

  const allVals = chartData.flatMap(d =>
    CHART_SERIES.map(s => (d as Record<string, number | string>)[s.key] as number ?? 0)
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
          <text key={i} x={PL + i * xStep} y={H - 8} fontSize={10} fill={M2} textAnchor="middle" fontFamily={MONO}>
            {chartData[i]?.date?.slice(5) ?? ""}
          </text>
        ))}
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
  const RETENTION: Record<string, number> = { twitch: 72, instagram: 68, tiktok: 71, youtube: 74, kick: 66 };
  return (
    <div style={surf({ padding: 22, height: "100%" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={LXS}>Platform Performance</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["", "Followers", "Growth", "Retention", "Trend"].map((h, i) => (
              <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding: "0 12px 10px", fontSize: 10.5, color: M, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: `1px solid ${BRD}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {platforms.map(p => {
            const color = COLORS[p.id] ?? M;
            const ret = RETENTION[p.id] ?? 70;
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
                <td style={{ padding: "10px 12px", fontSize: 13, color: M, fontVariantNumeric: "tabular-nums" }}>{ret}%</td>
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
// RANKING MOVEMENT SECTION
// ─────────────────────────────────────────────────────────────────

function RankingMovementSection({ kuwaitRank, arabRank, rankMovement }: {
  kuwaitRank: number | null;
  arabRank: number | null;
  rankMovement: number | null;
}) {
  const cells = [
    { value: rankMovement !== null ? (rankMovement > 0 ? `↑${rankMovement}` : rankMovement < 0 ? `↓${Math.abs(rankMovement)}` : "—") : "—", caption: "Climbed Places This Week", accent: true },
    { value: kuwaitRank ? `#${kuwaitRank}` : "#—", caption: "Gaming Creator Kuwait", accent: false },
    { value: "Top 1%", caption: "Audience Loyalty", accent: true },
    { value: "8%",     caption: "Closing Gap with #1", accent: false },
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
// RIVALRY + ALSO WATCHES
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

function RivalrySection({ creatorName, creatorInit }: { creatorName: string; creatorInit: string }) {
  const left  = { name: creatorName, handle: "@" + creatorName.toLowerCase(), score: 89, tone: "warm", init: creatorInit };
  const right = { name: "عزيزوز",   handle: "@Azizoz",  score: 87, tone: "plum", init: "ع" };
  return (
    <div style={{ ...surf({ padding: 24, height: "100%" }), position: "relative", overflow: "hidden" }}>
      {/* Content (blurred behind veil) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <span style={LXS}>Creator Rivalry</span>
        <span style={{ fontSize: 11.5, color: M }}>Head-to-Head · This Month</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 26, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <AvatarEl size={86} label={left.init} ring tone={left.tone} />
          <div style={{ fontFamily: ARABIC, fontSize: 22, fontWeight: 600, marginTop: 4, color: TX }}>{left.name}</div>
          <div style={{ fontSize: 12, color: M }}>{left.handle}</div>
          <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 600, lineHeight: 1, color: A, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{left.score}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: M2, fontFamily: MONO }}>SAHA SCORE</div>
        </div>
        <span style={{ fontFamily: SERIF, fontSize: 28, color: M2, letterSpacing: "0.08em", textAlign: "center", display: "block" }}>VS</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <AvatarEl size={86} label={right.init} ring tone={right.tone} />
          <div style={{ fontFamily: ARABIC, fontSize: 22, fontWeight: 600, marginTop: 4, color: TX }}>{right.name}</div>
          <div style={{ fontSize: 12, color: M }}>{right.handle}</div>
          <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 600, lineHeight: 1, color: A, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{right.score}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.22em", color: M2, fontFamily: MONO }}>SAHA SCORE</div>
        </div>
      </div>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <VsBar left={32} right={28} label="Audience Overlap"  />
        <VsBar left={14} right={9}  label="Growth Race (30D)" accent />
        <VsBar left={87} right={83} label="Consistency"       />
        <VsBar left={88} right={81} label="Momentum"          />
      </div>
      {/* Lock veil */}
      <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(7px)", background: "linear-gradient(180deg, rgba(11,10,18,0.45), rgba(11,10,18,0.82))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: TX }}>Creator Rivalry</div>
        <div style={{ fontSize: 12, color: M, lineHeight: 1.6, maxWidth: 220 }}>Head-to-head comparisons &amp; rivalry stats are available on SAHA Pro.</div>
        <a href="/subscribe" style={{ marginTop: 4, height: 32, padding: "0 14px", background: "transparent", border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Subscribe to Pro
        </a>
      </div>
    </div>
  );
}

function AlsoWatches() {
  const creators = [
    { name: "AboFlah",    followers: "1.9M Followers", tone: "warm" },
    { name: "Ahmed Show", followers: "1.2M Followers", tone: "olive" },
    { name: "P4GAM3R",   followers: "986K Followers",  tone: "cool" },
  ];
  return (
    <div style={{ ...surf({ padding: 22 }), position: "relative", overflow: "hidden" }}>
      {/* Content (blurred behind veil) */}
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
      {/* Lock veil */}
      <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(7px)", background: "linear-gradient(180deg, rgba(11,10,18,0.45), rgba(11,10,18,0.82))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: "0 20px" }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: TX }}>Audience Intelligence</div>
        <div style={{ fontSize: 11.5, color: M, lineHeight: 1.6 }}>Audience overlap data is available on SAHA Pro.</div>
        <a href="/subscribe" style={{ marginTop: 4, height: 30, padding: "0 12px", background: "transparent", border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Subscribe to Pro
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BADGE SHOWCASE
// ─────────────────────────────────────────────────────────────────

type BadgeKind = "founding"|"verified"|"top10"|"rising"|"elite"|"consistent"|"breakout";

function BadgeIcon({ kind }: { kind: BadgeKind }) {
  const icons: Record<BadgeKind, ReactNode> = {
    founding:   <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><polygon points="20,4 24,14 35,15 26,22 29,33 20,27 11,33 14,22 5,15 16,14" fill={`${A}18`} stroke={A} strokeWidth="1" /><text x="20" y="24" textAnchor="middle" fontFamily={SERIF} fontSize="11" fill={A} fontWeight="600">F</text></svg>,
    verified:   <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><path d="M20 4l4 3 5-1 2 4 4 2-1 5 2 5-3 4 1 5-5 1-3 4-5-2-5 2-3-4-5-1 1-5-3-4 2-5-1-5 4-2 2-4 5 1z" fill={`${A}10`} stroke={A} strokeWidth="1" /><path d="M14 21l4 4 8-9" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>,
    top10:      <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><path d="M8 8h24v6l-6 6h2l4 6v6H8v-6l4-6h2l-6-6z" fill={`${A}12`} stroke={A} strokeWidth="1" /><text x="20" y="25" textAnchor="middle" fontFamily={SERIF} fontSize="10" fill={A} fontWeight="700">10</text></svg>,
    rising:     <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="14" fill="none" stroke={A} strokeWidth="1" opacity="0.6" /><path d="M14 26l5-7 4 4 6-8" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" /><path d="M24 15h6v6" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>,
    elite:      <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><path d="M6 14l5-7 9 4 9-4 5 7-3 18H9z" fill={`${A}12`} stroke={A} strokeWidth="1" /><path d="M16 22l4 3 4-5" stroke={A} strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>,
    consistent: <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><rect x="8" y="8" width="24" height="24" rx="2" fill="none" stroke={A} strokeWidth="1" opacity="0.7" /><path d="M10 24l5-3 4 2 4-5 4 1 3-3" stroke={A} strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>,
    breakout:   <svg width="34" height="34" viewBox="0 0 40 40" fill="none"><path d="M20 6L26 14h-3v8l4 4 4-3-1 8-8 4-8-4-1-8 4 3 4-4v-8h-3z" fill={`${A}12`} stroke={A} strokeWidth="1" /></svg>,
  };
  return icons[kind] ?? null;
}

const BADGES: { name: string; icon: BadgeKind }[] = [
  { name: "Founding Creator", icon: "founding"   },
  { name: "SAHA Verified",    icon: "verified"   },
  { name: "Top 10 Kuwait",    icon: "top10"      },
  { name: "Rising Creator",   icon: "rising"     },
  { name: "SAHA Elite",       icon: "elite"      },
  { name: "Most Consistent",  icon: "consistent" },
  { name: "Breakout Creator", icon: "breakout"   },
];

function BadgeShowcase() {
  return (
    <div style={surf({ padding: 24, marginTop: 18 })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={LXS}>Certifications · Badges</span>
        <span style={{ fontSize: 11.5, color: M }}>7 of 24 earned</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
        {BADGES.map(b => (
          <div key={b.name} style={{
            padding: "20px 14px 16px", border: `1px solid ${BRD}`, borderRadius: 12,
            background: `linear-gradient(180deg, ${A}06, transparent 50%), ${SF}`,
            display: "flex", flexDirection: "column", gap: 12, alignItems: "center",
            textAlign: "center", height: 132, justifyContent: "space-between",
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
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC INSIGHTS
// ─────────────────────────────────────────────────────────────────

function genTrend(seed: number, len: number): number[] {
  let v = 5;
  return Array.from({ length: len }, (_, i) => {
    v += Math.sin(seed + i) * 1.2 + (i % 3 === 0 ? 0.3 : -0.1);
    return +v.toFixed(2);
  });
}

const INSIGHTS_DATA = [
  { metric: "Viewer Loyalty",     your: "92%",    percentile: "Top 12%", delta: 5,  down: false },
  { metric: "Avg Watch Duration", your: "1h 48m", percentile: "Top 18%", delta: 6,  down: false },
  { metric: "Stream Consistency", your: "87%",    percentile: "Top 15%", delta: 6,  down: false },
  { metric: "Audience Overlap",   your: "32%",    percentile: "Top 22%", delta: -2, down: true  },
  { metric: "Growth Velocity",    your: "14.3%",  percentile: "Top 11%", delta: 3,  down: false },
  { metric: "Retention Score",    your: "72%",    percentile: "Top 16%", delta: 4,  down: false },
  { metric: "Discovery Rate",     your: "26%",    percentile: "Top 20%", delta: 5,  down: false },
];

function PublicInsights() {
  return (
    <div style={surf({ padding: 22, height: "100%" })}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={LXS}>Public Creator Insights</span>
        <span style={{ fontSize: 11.5, color: M }}>Audited · 30 day window</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Metric", "Your Stats", "Percentile", "vs 30 Days", "Trend"].map((h, i) => (
              <th key={h} style={{ textAlign: i === 4 ? "right" : "left", padding: "0 12px 10px", fontSize: 10.5, color: M, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: `1px solid ${BRD}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INSIGHTS_DATA.map((row, idx) => (
            <tr key={row.metric} style={{ borderBottom: `1px solid ${BS}` }}>
              <td style={{ padding: "10px 12px", fontSize: 13, color: TX }}>{row.metric}</td>
              <td style={{ padding: "10px 12px", fontSize: 13, fontVariantNumeric: "tabular-nums", color: TX }}>{row.your}</td>
              <td style={{ padding: "10px 12px", fontSize: 12.5, color: M, fontVariantNumeric: "tabular-nums" }}>{row.percentile}</td>
              <td style={{ padding: "10px 12px" }}><Delta value={row.delta} /></td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                <SparkSVG data={genTrend(idx * 40, 7)} width={120} height={22} stroke={row.down ? DN : A} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────

type LeaderboardEntry = {
  rank: number; name: string; arabic: boolean; score: number;
  scoreDelta: number; rankDelta: number; followers: string; growth: number; you: boolean;
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "AboFlah",    arabic: false, score: 92, scoreDelta: 4, rankDelta:  0, followers: "1.9M",  growth: 18.7, you: false },
  { rank: 2, name: "P4GAM3R",   arabic: false, score: 91, scoreDelta: 3, rankDelta:  0, followers: "986K",  growth: 16.3, you: false },
  { rank: 3, name: "سبيكس",      arabic: true,  score: 89, scoreDelta: 7, rankDelta:  2, followers: "1.35M", growth: 14.3, you: false },
  { rank: 4, name: "Azizoz",    arabic: false, score: 87, scoreDelta: 2, rankDelta: -1, followers: "1.1M",  growth: 9.1,  you: false },
  { rank: 5, name: "Ahmed Show", arabic: false, score: 86, scoreDelta: 5, rankDelta:  0, followers: "1.2M",  growth: 12.8, you: false },
];

function LeaderboardSection({ creators, currentHandle }: { creators: LeaderboardEntry[]; currentHandle: string }) {
  const momentum: Record<number, number[]> = {
    1: [4,5,5,6,6,7,7,8,8,9,10,11], 2: [3,4,4,5,6,6,7,7,8,9,10,10],
    3: [2,3,3,4,5,7,8,9,10,11,12,14], 4: [5,5,6,6,5,6,6,7,7,8,8,9],
    5: [3,4,5,5,6,7,7,8,9,10,11,12],
  };
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
          {creators.map(l => {
            const isYou = l.name.toLowerCase() === currentHandle.toLowerCase() || l.you;
            return (
              <tr key={l.rank} style={{ background: isYou ? `${A}0d` : "transparent", borderBottom: `1px solid ${BS}` }}>
                <td style={{ padding: "10px 10px", fontFamily: SERIF, fontSize: 16, color: isYou ? A : M, fontVariantNumeric: "tabular-nums" }}>{l.rank}</td>
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AvatarEl size={26} label={l.name[0]} tone={isYou ? "warm" : "default"} ring={isYou} />
                    <span style={{ fontSize: 13.5, fontWeight: isYou ? 500 : 400, color: TX, fontFamily: l.arabic ? ARABIC : undefined }}>
                      {l.name}
                    </span>
                    {isYou && (
                      <span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 6px", border: `1px solid ${A}`, borderRadius: 3, fontSize: 9, color: A }}>
                        YOU
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "10px 10px", fontFamily: SERIF, fontSize: 16, fontVariantNumeric: "tabular-nums", color: TX }}>{l.score}</td>
                <td style={{ padding: "10px 10px" }}><Delta value={l.scoreDelta} suffix="" /></td>
                <td style={{ padding: "10px 10px" }}>
                  {l.rankDelta === 0 ? <span style={{ color: M2 }}>—</span> : <Delta value={l.rankDelta} suffix="" />}
                </td>
                <td style={{ padding: "10px 10px" }}><SparkSVG data={momentum[l.rank] ?? []} width={90} height={20} stroke={A} /></td>
                <td style={{ padding: "10px 10px", fontSize: 13, fontVariantNumeric: "tabular-nums", color: TX }}>{l.followers}</td>
                <td style={{ padding: "10px 10px", textAlign: "right" }}><Delta value={l.growth} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LOCKED TEASER
// ─────────────────────────────────────────────────────────────────

function LockedTeaser() {
  const items = ["Historical Rank", "Audience Migration", "Cohort Analysis", "Forecast Index"];
  return (
    <div style={{ ...surf({ marginTop: 18, height: 220, position: "relative", overflow: "hidden", padding: 0 }) }}>
      <div style={{ padding: 22 }}>
        <span style={LXS}>Advanced Growth Insights</span>
        <div style={{ marginTop: 16, height: 150, opacity: 0.4 }}>
          <SparkSVG data={[5,8,6,10,7,12,9,14,11,16,12,17,13,19,15,21,16,23,18,25]} width={900} height={150} stroke={M2} fill />
        </div>
      </div>
      {/* Teaser row */}
      <div style={{ position: "absolute", top: 22, left: 22, right: 22, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", opacity: 0.35 }}>
        {items.map((t, i) => (
          <div key={t} style={{ padding: "0 16px", borderLeft: i > 0 ? `1px solid ${BS}` : "none" }}>
            <span style={LXS}>{t}</span>
            <div style={{ fontFamily: SERIF, fontSize: 24, color: M2, marginTop: 8 }}>━ ━ ━</div>
          </div>
        ))}
      </div>
      {/* Lock veil */}
      <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)", background: "linear-gradient(180deg, rgba(11,10,18,0.55), rgba(11,10,18,0.88))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
        <span style={{ fontSize: 20 }}>🔒</span>
        <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, color: TX }}>SAHA Analytics Pro</div>
        <div style={{ fontSize: 12.5, color: M, lineHeight: 1.6, maxWidth: 420 }}>
          Subscribe to unlock advanced momentum tracking, historical ranking intelligence, and creator comparison tools.
        </div>
        <a href="/subscribe" style={{ marginTop: 4, height: 34, padding: "0 16px", background: "transparent", border: `1px solid ${A}`, borderRadius: 8, color: A, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Subscribe to Pro
        </a>
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
// PAGE
// ─────────────────────────────────────────────────────────────────

type SnapshotRow = { platform: string; followers: number; snapshot_date: string };

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: creatorRaw, error } = await supabase
    .from("creators")
    .select("*, platforms:creator_platforms(*), score:creator_scores(*)")
    .eq("handle", handle)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (error || !creatorRaw) notFound();

  const creatorId = creatorRaw.id as string;

  // ── Analytics queries ──────────────────────────────────────────
  type DailyScoreRow = {
    saha_score: number; growth_score: number; momentum_score: number;
    consistency_score: number; presence_score: number; rank_score: number;
    rank_country: number | null; rank_arab_world: number | null;
    rank_genre: number | null; calculated_date: string;
  };
  type RankSnapRow    = { rank_country: number | null; rank_arab_world: number | null; snapshot_date: string };
  type GrowthDbRow   = { period: string; followers_start: number; followers_end: number };

  const today = new Date().toISOString().slice(0, 10);
  const d30   = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [
    { data: dailyScoreRaw },
    { data: prevSnapRaw },
    { data: growthRaw },
    { data: snapshotRaw },
  ] = await Promise.all([
    supabase
      .from("creator_daily_scores")
      .select("saha_score,growth_score,momentum_score,consistency_score,presence_score,rank_score,rank_country,rank_arab_world,rank_genre,calculated_date")
      .eq("creator_id", creatorId)
      .lte("calculated_date", today)
      .order("calculated_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("creator_rank_snapshots")
      .select("rank_country,rank_arab_world,snapshot_date")
      .eq("creator_id", creatorId)
      .lte("snapshot_date", new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("creator_growth")
      .select("period,followers_start,followers_end")
      .eq("creator_id", creatorId)
      .in("period", ["7d", "30d"]),

    supabase
      .from("creator_snapshots")
      .select("platform,followers,snapshot_date")
      .eq("creator_id", creatorId)
      .gte("snapshot_date", d30)
      .lte("snapshot_date", today)
      .order("snapshot_date", { ascending: true })
      .limit(300),
  ]);

  const dailyScore = dailyScoreRaw as DailyScoreRow | null;
  const prevSnap   = prevSnapRaw   as RankSnapRow   | null;

  // ── Followers ─────────────────────────────────────────────────
  type PlatformEntry = { platform: string; followers?: number; platform_username?: string };
  const platforms      = (creatorRaw.platforms ?? []) as PlatformEntry[];
  const totalFollowers = platforms.reduce((s, p) => s + (p.followers ?? 0), 0);

  // ── Growth % ──────────────────────────────────────────────────
  const growthList = (growthRaw ?? []) as GrowthDbRow[];
  const g30 = growthList.find(g => g.period === "30d");
  const g7  = growthList.find(g => g.period === "7d");
  const growth30dPct   = g30?.followers_start ? ((g30.followers_end - g30.followers_start) / g30.followers_start) * 100 : null;
  const growth7dPct    = g7?.followers_start  ? ((g7.followers_end  - g7.followers_start)  / g7.followers_start)  * 100 : null;
  const growth7dDelta  = g7  ? g7.followers_end  - g7.followers_start  : null;
  const growth30dDelta = g30 ? g30.followers_end - g30.followers_start : null;

  // ── Ranks ─────────────────────────────────────────────────────
  const kuwaitRank     = dailyScore?.rank_country    ?? null;
  const arabRank       = dailyScore?.rank_arab_world ?? null;
  const prevKuwaitRank = prevSnap?.rank_country      ?? null;
  const rankMovement   = (kuwaitRank && prevKuwaitRank) ? prevKuwaitRank - kuwaitRank : null;

  // ── SAHA Score ────────────────────────────────────────────────
  const sahaScore    = dailyScore
    ? Math.round(Number(dailyScore.saha_score))
    : Math.round(Number((creatorRaw.score as { final_score?: number } | null)?.final_score ?? 0));
  const momentumScore = dailyScore ? Math.round(Number(dailyScore.momentum_score)) : null;

  // ── Chart data ────────────────────────────────────────────────
  const snapshotList = (snapshotRaw ?? []) as SnapshotRow[];
  const dateMap = new Map<string, Record<string, number>>();
  for (const s of snapshotList) {
    if (!dateMap.has(s.snapshot_date)) dateMap.set(s.snapshot_date, {});
    dateMap.get(s.snapshot_date)![s.platform] = s.followers;
  }
  const chartDataReal = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  const MOCK_CHART_DATA = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(d30); d.setDate(d.getDate() + i);
    return {
      date:      d.toISOString().slice(0, 10),
      twitch:    Math.round(10000 + i * 833  + Math.sin(i * 0.8) * 400),
      instagram: Math.round( 8000 + i * 467  + Math.sin(i * 0.6) * 250),
      tiktok:    Math.round( 4000 + i * 300  + Math.cos(i * 0.9) * 150),
      youtube:   Math.round( 2000 + i * 200  + Math.cos(i * 0.5) * 100),
    };
  });

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
    : MOCK_CHART_DATA;

  // ── Platform performance ──────────────────────────────────────
  const MOCK_PLATFORM_PERF = [
    { id: "twitch",    followers: 35000, growth: 22.4, sparkData: [18,19,20,20,21,21,22,22,23,22,23,22.4] },
    { id: "instagram", followers: 22000, growth: 18.1, sparkData: [14,15,15,16,16,17,17,17,18,18,18,18.1] },
    { id: "tiktok",    followers: 13000, growth: 16.7, sparkData: [11,12,13,13,14,14,15,15,16,16,17,16.7] },
    { id: "youtube",   followers:  8000, growth: 13.9, sparkData: [ 9,10,10,11,11,12,12,13,13,14,14,13.9] },
  ];
  const PLATFORM_ORDER = ["twitch", "instagram", "tiktok", "youtube", "kick"];
  const platformPerformance = PLATFORM_ORDER
    .map(id => {
      const p = platforms.find(pl => pl.platform === id);
      if (!p || !p.followers) return null;
      return { id, followers: p.followers ?? 0, growth: growth30dPct ?? null, sparkData: MOCK_PLATFORM_PERF.find(pp => pp.id === id)?.sparkData ?? [] };
    })
    .filter(Boolean) as typeof MOCK_PLATFORM_PERF;
  const platformData = platformPerformance.length > 0 ? platformPerformance : MOCK_PLATFORM_PERF;

  // ── Creator info ──────────────────────────────────────────────
  const creator: CreatorData = {
    handle:       creatorRaw.handle      as string,
    name_en:      creatorRaw.name_en     as string,
    name_ar:      creatorRaw.name_ar     as string,
    country_code: creatorRaw.country_code as string,
    genres:       creatorRaw.genres      as string[] ?? [],
    is_live:      creatorRaw.is_live     as boolean  ?? false,
    is_verified:  creatorRaw.is_verified as boolean  ?? false,
    avatar_url:   creatorRaw.avatar_url  as string | null,
    platforms:    (creatorRaw.platforms  as CreatorPlatformEntry[]) ?? [],
  };

  const displayName = creator.name_ar || creator.name_en || creator.handle;
  const creatorInit = (creator.name_ar || creator.name_en || creator.handle).slice(0, 1).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#0B0A12" }}>
      <HeaderPublic />
      <main style={{ maxWidth: 1680, margin: "0 auto", padding: "0 48px 48px", position: "relative", zIndex: 1 }}>

        <PageHeader name={displayName} isLive={creator.is_live} />

        {/* Hero — 3 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,40fr) minmax(0,30fr) minmax(0,30fr)", gap: 32, marginTop: 36 }}>
          <IdentityColumn creator={creator} />
          <CenterColumn score={sahaScore > 0 ? sahaScore : 89} momentumScore={momentumScore} />
          <RankingsColumn
            kuwaitRank={kuwaitRank ?? 8}
            gccRank={arabRank ?? 21}
            rankMovement={rankMovement}
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
        />

        <CreatorPerformance />

        {/* Chart + Platform Table */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "65% 35%", gap: 18 }}>
          <ChartPanel chartData={chartData} />
          <PlatformTable platforms={platformData} />
        </div>

        <RankingMovementSection kuwaitRank={kuwaitRank} arabRank={arabRank} rankMovement={rankMovement} />

        {/* Rivalry + Also Watches */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 18 }}>
          <RivalrySection creatorName={displayName} creatorInit={creatorInit} />
          <AlsoWatches />
        </div>

        <BadgeShowcase />

        {/* Public Insights + Leaderboard */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 18 }}>
          <PublicInsights />
          <LeaderboardSection creators={MOCK_LEADERBOARD} currentHandle={handle} />
        </div>

        <LockedTeaser />
        <Footer />
      </main>
    </div>
  );
}
