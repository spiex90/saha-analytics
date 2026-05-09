"use client";

/**
 * CalibrationRing
 *
 * Replaces the normal SAHA Score ring during a creator's first 7 days.
 * Shows an animated partial ring, projected score range, and a live
 * countdown. All animation uses CSS @keyframes so it stays client-side.
 *
 * Props are all serializable — safe to pass from a Server Component.
 */

import React from "react";

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS (must match dashboard page)
// ─────────────────────────────────────────────────────────────────
const A    = "#F4A52C";
const BRD  = "#2A263A";
const BS   = "#1f1c2e";
const TX   = "#F5EFE0";
const M    = "#A7A0B8";
const M2   = "#6f6982";
const SF   = "#0F1118";
const SERIF  = "var(--font-serif), Georgia, serif";
const MONO   = "var(--font-mono), ui-monospace, monospace";

type Sty = React.CSSProperties;

function surf(extra: Sty = {}): Sty {
  return { background: SF, border: `1px solid ${BRD}`, borderRadius: 14, ...extra };
}

const LXS: Sty = {
  fontSize: 10.5, letterSpacing: "0.16em",
  textTransform: "uppercase", color: M, fontWeight: 500,
};

// ─────────────────────────────────────────────────────────────────
// STATUS MESSAGE MAP
// ─────────────────────────────────────────────────────────────────
const STATUS_MESSAGES = [
  "Growth baseline forming",
  "Momentum tracking active",
  "Ranking engine calibrating",
  "Consistency window opening",
  "Platform data syncing",
];

export interface CalibrationRingProps {
  /** Approximate score based on available signals (e.g. presence + rough growth). */
  projectedLow: number;
  /** Upper bound of projected range. */
  projectedHigh: number;
  /** ms remaining until calibration ends. null = unknown. */
  msRemaining: number | null;
  /** Days remaining (pre-computed for SSR). */
  daysRemaining: number | null;
  /** Hours remaining (pre-computed, already mod 24). */
  hoursRemaining: number | null;
  /** Minutes remaining (pre-computed, already mod 60). */
  minutesRemaining: number | null;
  /** How many pillars to show in the sub-row (score components we CAN compute). */
  pillars?: Array<{ k: string; v: number | string }>;
  /** Whether this is in the public profile (slightly different copy). */
  isPublic?: boolean;
}

export function CalibrationRing({
  projectedLow,
  projectedHigh,
  daysRemaining,
  hoursRemaining,
  minutesRemaining,
  pillars = [],
  isPublic = false,
}: CalibrationRingProps) {
  const size   = 370;
  const radius = size / 2 - 18;
  const circ   = 2 * Math.PI * radius;

  // Show ~40% of the arc to indicate "in progress"
  const arcPct    = 0.40;
  const arcOffset = circ * (1 - arcPct);

  // Tick marks (same as normal ring)
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

  // Cycle through status messages
  const [msgIdx, setMsgIdx] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % STATUS_MESSAGES.length), 2800);
    return () => clearInterval(id);
  }, []);

  const subPillars = pillars.length > 0 ? pillars : [
    { k: "Presence",    v: "—" },
    { k: "Growth",      v: "—" },
    { k: "Momentum",    v: "—" },
    { k: "Consistency", v: "—" },
    { k: "Rank",        v: "—" },
  ];

  const countdownStr = daysRemaining !== null && hoursRemaining !== null && minutesRemaining !== null
    ? `${daysRemaining}D · ${String(hoursRemaining).padStart(2,"0")}H · ${String(minutesRemaining).padStart(2,"0")}M`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Calibration ring card */}
      <div style={surf({ padding: 34, display: "flex", flexDirection: "column" })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={LXS}>SAHA Score Index</span>
          <span style={{ fontSize: 10.5, letterSpacing: "0.18em", color: M2, fontFamily: MONO }}>
            CALIBRATING
          </span>
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

          {/* Progress arc — animated partial ring */}
          <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <style>{`
                @keyframes saha-calibrate-spin {
                  from { transform: rotate(-90deg); }
                  to   { transform: rotate(270deg); }
                }
                @keyframes saha-calibrate-pulse {
                  0%, 100% { opacity: 0.55; }
                  50%       { opacity: 1; }
                }
              `}</style>
            </defs>

            {/* Dark inner fill */}
            <circle cx={size / 2} cy={size / 2} r={radius - 4} fill="rgba(0,0,0,0.35)" />
            {/* Track ring */}
            <circle cx={size / 2} cy={size / 2} r={radius}
              stroke="rgba(255,255,255,0.06)" strokeWidth={5} fill="none" />

            {/* Spinning arc group */}
            <g style={{
              transformOrigin: `${size / 2}px ${size / 2}px`,
              animation: "saha-calibrate-spin 3.2s linear infinite",
            }}>
              {/* Outer bloom */}
              <circle cx={size / 2} cy={size / 2} r={radius}
                stroke={A} strokeWidth={14} fill="none" opacity={0.10}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={arcOffset} />
              {/* Mid bloom */}
              <circle cx={size / 2} cy={size / 2} r={radius}
                stroke={A} strokeWidth={8} fill="none" opacity={0.20}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={arcOffset} />
              {/* Main arc */}
              <circle cx={size / 2} cy={size / 2} r={radius}
                stroke={A} strokeWidth={5} fill="none"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={arcOffset}
                style={{ filter: "drop-shadow(0 0 8px rgba(244,165,44,0.8)) drop-shadow(0 0 18px rgba(244,165,44,0.35))" }} />
            </g>
          </svg>

          {/* Center text */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>

            {/* CALIBRATING label */}
            <span style={{ fontSize: 10, letterSpacing: "0.32em", color: M, fontFamily: MONO }}>
              SAHA SCORE
            </span>

            {/* Projected range */}
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: SERIF, fontSize: 64, lineHeight: 0.95, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX, opacity: 0.45 }}>
                {projectedLow}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 18, color: M2 }}>–</span>
              <span style={{ fontFamily: SERIF, fontSize: 64, lineHeight: 0.95, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TX, opacity: 0.45 }}>
                {projectedHigh}
              </span>
            </div>

            <span style={{ fontSize: 10.5, letterSpacing: "0.28em", color: A, marginTop: 8, fontFamily: MONO }}>
              CALIBRATING
            </span>

            {/* Status message */}
            <span style={{
              fontSize: 10.5, color: M2, fontFamily: MONO, marginTop: 10,
              letterSpacing: "0.06em", maxWidth: 200, lineHeight: 1.5,
              animation: "saha-calibrate-pulse 2.8s ease-in-out infinite",
            }}>
              {STATUS_MESSAGES[msgIdx]}
            </span>

            {/* Countdown */}
            {countdownStr && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, letterSpacing: "0.32em", color: M2, fontFamily: MONO }}>
                  {isPublic ? "SCORE READY IN" : "CALIBRATION ENDS IN"}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 16, color: A, letterSpacing: "0.14em", fontVariantNumeric: "tabular-nums" }}>
                  {countdownStr}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sub-pillars */}
        <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${BS}`, marginTop: 18 }}>
          {subPillars.map((p, idx) => (
            <div key={p.k} style={{
              flex: 1, padding: "16px 0 18px", textAlign: "center",
              borderRight: idx < subPillars.length - 1 ? `1px solid ${BS}` : "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 10.5, color: M, letterSpacing: "0.04em" }}>{p.k}</span>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: M2, lineHeight: 1 }}>
                {p.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calibration status card */}
      <div style={surf({ padding: "20px 22px" })}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={LXS}>Calibration Period Active</span>
            <span style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1, color: TX }}>
              Collecting baseline data
            </span>
            <span style={{ fontSize: 12, color: M, lineHeight: 1.6, maxWidth: 280 }}>
              SAHA tracks 7 days of activity before computing an official score.
              Your data is already being collected.
            </span>
          </div>
          {/* Progress indicator */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${A}30`, display: "flex", alignItems: "center", justifyContent: "center", background: `${A}08` }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <circle cx={12} cy={12} r={10} stroke={A} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
                <path d="M12 6v6l4 2" stroke={A} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 9.5, color: M2, fontFamily: MONO, letterSpacing: "0.1em" }}>
              SAHA ANALYTICS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
