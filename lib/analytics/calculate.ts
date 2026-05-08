/**
 * SAHA Analytics — Pure Calculation Engine (v2)
 *
 * All functions are pure: no DB I/O, no side effects.
 * Every visible metric is derivable, explainable, and defensible.
 *
 * Weights:
 *   Growth Score      30%
 *   Momentum Score    25%
 *   Rank Score        20%
 *   Consistency Score 15%
 *   Presence Score    10%
 */

export type MomentumLabel =
  | "Cooling Down"
  | "Stable"
  | "Building Momentum"
  | "Rising Fast"
  | "Exploding";

// ─────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────

/** Clamp a value to [min, max]. */
function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/** Round to 1 decimal place. */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Piecewise-linear interpolation.
 * points must be sorted by x ascending.
 */
export function interpolate(
  x: number,
  points: ReadonlyArray<readonly [number, number]>
): number {
  if (points.length === 0) return 0;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

// ─────────────────────────────────────────────────────────────────
// GROWTH SCORE  (30% of SAHA)
// ─────────────────────────────────────────────────────────────────

const GROWTH_CURVE = [
  [-5, 0],
  [-3, 10],
  [-1, 20],
  [0, 30],
  [1, 45],
  [3, 60],
  [5, 75],
  [10, 100],
] as const;

/**
 * Growth score (0–100) from 30-day growth percentage.
 * @param growth30dPct  e.g. 18.7 for 18.7% growth
 */
export function computeGrowthScore(growth30dPct: number): number {
  return clamp(round1(interpolate(growth30dPct, GROWTH_CURVE)));
}

// ─────────────────────────────────────────────────────────────────
// MOMENTUM SCORE  (25% of SAHA)
// ─────────────────────────────────────────────────────────────────

export interface MomentumInput {
  /** followers_today - followers_7d_ago, as a percentage of followers_7d_ago */
  recent7dGrowthPct: number;
  /** followers_7d_ago - followers_14d_ago, as a percentage of followers_14d_ago */
  prior7dGrowthPct: number;
  isLiveNow: boolean;
  /** null = no data; otherwise hours since last live */
  hoursSinceLastLive: number | null;
}

export function computeMomentumScore(input: MomentumInput): {
  score: number;
  label: MomentumLabel;
} {
  const { recent7dGrowthPct, prior7dGrowthPct, isLiveNow, hoursSinceLastLive } =
    input;

  // 7-day growth component (50% weight) — scale to 0–100
  const growthBase = clamp(
    round1(interpolate(recent7dGrowthPct, GROWTH_CURVE))
  );

  // Acceleration component (35% weight)
  // delta: how much faster are we growing vs the prior period
  const accelerationDelta = recent7dGrowthPct - prior7dGrowthPct;
  // scale: +5% delta → +20 pts, -5% → -20 pts, capped at ±30
  const accelerationContrib = clamp(
    50 + accelerationDelta * 4,
    20,
    80
  );

  // Activity component (15% weight)
  let activityBase = 50; // neutral
  if (isLiveNow) {
    activityBase = 90;
  } else if (hoursSinceLastLive !== null) {
    if (hoursSinceLastLive <= 7 * 24) activityBase = 75;
    else if (hoursSinceLastLive <= 14 * 24) activityBase = 60;
    else if (hoursSinceLastLive > 30 * 24) activityBase = 20;
  }

  const raw =
    growthBase * 0.5 +
    accelerationContrib * 0.35 +
    activityBase * 0.15;

  // Activity bonuses (additive, applied after weighted base)
  let bonus = 0;
  if (isLiveNow) bonus += 10;
  else if (hoursSinceLastLive !== null) {
    if (hoursSinceLastLive <= 7 * 24) bonus += 6;
    else if (hoursSinceLastLive <= 14 * 24) bonus += 3;
    else if (hoursSinceLastLive > 30 * 24) bonus -= 10;
  }

  const score = clamp(round1(raw + bonus));
  return { score, label: momentumLabel(score) };
}

export function momentumLabel(score: number): MomentumLabel {
  if (score >= 85) return "Exploding";
  if (score >= 70) return "Rising Fast";
  if (score >= 50) return "Building Momentum";
  if (score >= 30) return "Stable";
  return "Cooling Down";
}

// ─────────────────────────────────────────────────────────────────
// CONSISTENCY SCORE  (15% of SAHA)
// ─────────────────────────────────────────────────────────────────

export interface ConsistencyInput {
  hasSchedule: boolean;
  liveInLast7d: boolean;
  liveInLast14d: boolean;
  /** null = unknown */
  completedStreams: number | null;
  expectedStreams: number | null;
}

export function computeConsistencyScore(input: ConsistencyInput): number {
  const { hasSchedule, liveInLast7d, liveInLast14d, completedStreams, expectedStreams } =
    input;

  // If we have hard stream history data, use the ratio
  if (
    completedStreams !== null &&
    expectedStreams !== null &&
    expectedStreams > 0
  ) {
    return clamp(round1((completedStreams / expectedStreams) * 100));
  }

  // Fallback chain
  if (hasSchedule && liveInLast7d) return 75;
  if (hasSchedule && liveInLast14d) return 60;
  if (hasSchedule) return 45;
  if (liveInLast7d) return 50;
  return 20;
}

// ─────────────────────────────────────────────────────────────────
// PRESENCE SCORE  (10% of SAHA)
// ─────────────────────────────────────────────────────────────────

const PLATFORM_SCORES: Record<number, number> = {
  1: 35,
  2: 55,
  3: 70,
  4: 85,
};

export interface PresenceInput {
  platformCount: number;
  primaryPlatformVerified: boolean;
}

export function computePresenceScore(input: PresenceInput): number {
  const base =
    input.platformCount >= 5
      ? 100
      : PLATFORM_SCORES[input.platformCount] ?? 0;
  const bonus = input.primaryPlatformVerified ? 5 : 0;
  return clamp(base + bonus);
}

// ─────────────────────────────────────────────────────────────────
// RANK SCORE  (20% of SAHA)
// ─────────────────────────────────────────────────────────────────

export interface RankInput {
  rankCountry: number | null;
  totalCountry: number;
  rankArab: number | null;
  totalArab: number;
  rankGenre: number | null;
  totalGenre: number;
}

/**
 * Average percentile rank across available scopes.
 * rank_percentile = 1 - ((rank - 1) / total)
 */
export function computeRankScore(ranks: RankInput): number {
  const components: number[] = [];

  if (ranks.rankCountry !== null && ranks.totalCountry > 0) {
    components.push(
      clamp((1 - (ranks.rankCountry - 1) / ranks.totalCountry) * 100)
    );
  }
  if (ranks.rankArab !== null && ranks.totalArab > 0) {
    components.push(
      clamp((1 - (ranks.rankArab - 1) / ranks.totalArab) * 100)
    );
  }
  if (ranks.rankGenre !== null && ranks.totalGenre > 0) {
    components.push(
      clamp((1 - (ranks.rankGenre - 1) / ranks.totalGenre) * 100)
    );
  }

  if (components.length === 0) return 0;
  const avg = components.reduce((a, b) => a + b, 0) / components.length;
  return clamp(round1(avg));
}

// ─────────────────────────────────────────────────────────────────
// INACTIVITY PENALTY
// ─────────────────────────────────────────────────────────────────

/**
 * Returns a negative penalty (or 0) to subtract from SAHA score.
 * @param daysInactive  null = active / unknown
 */
export function inactivityPenalty(daysInactive: number | null): number {
  if (daysInactive === null || daysInactive < 30) return 0;
  if (daysInactive >= 60) return -12;
  return -5;
}

// ─────────────────────────────────────────────────────────────────
// SAHA SCORE  (composite)
// ─────────────────────────────────────────────────────────────────

export interface SahaScoreParts {
  growth: number;      // weight 0.30
  momentum: number;    // weight 0.25
  rankScore: number;   // weight 0.20
  consistency: number; // weight 0.15
  presence: number;    // weight 0.10
  penalty: number;     // additive (must be ≤ 0)
}

export function computeSahaScore(parts: SahaScoreParts): number {
  const raw =
    parts.growth * 0.3 +
    parts.momentum * 0.25 +
    parts.rankScore * 0.2 +
    parts.consistency * 0.15 +
    parts.presence * 0.1 +
    parts.penalty;
  return clamp(Math.round(raw));
}

export function sahaScoreLabel(
  score: number
): "Emerging" | "Building" | "Strong" | "Excellent" | "Elite" {
  if (score >= 90) return "Elite";
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Building";
  return "Emerging";
}

// ─────────────────────────────────────────────────────────────────
// DERIVED DASHBOARD METRICS
// ─────────────────────────────────────────────────────────────────

/**
 * Percentage change from previous to current.
 * Returns null if previous is 0 or unavailable.
 */
export function pctChange(
  current: number,
  previous: number | null
): number | null {
  if (!previous) return null;
  return round1(((current - previous) / previous) * 100);
}

/**
 * "Outperforming X% of creators" given rank and total.
 */
export function outperformingPct(rank: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(round1(((total - rank) / total) * 100));
}

/**
 * Score gap to creator directly above in ranking.
 * Returns null if creator is #1 or no data.
 */
export function closingGap(
  myScore: number,
  scoreAbove: number | null
): number | null {
  if (scoreAbove === null) return null;
  const gap = scoreAbove - myScore;
  if (gap <= 0) return null; // We're ahead
  return round1(gap);
}

export function closingGapLabel(
  rank: number,
  gap: number | null
): string | null {
  if (rank === 1 || gap === null) return null;
  const above = rank - 1;
  if (gap <= 3) return `Closing gap with #${above} creator`;
  if (gap <= 7) return `Within striking distance of #${above}`;
  return `Chasing #${above} creator`;
}
