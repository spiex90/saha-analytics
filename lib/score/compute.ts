/**
 * SAHA Score computation engine.
 *
 * Weights:
 *   40% audience  — log10-scaled follower count
 *   30% growth    — monthly follower growth percentage
 *   20% activity  — snapshot density (how often data was captured)
 *   10% diversity — number of platforms with active presence
 */

const WEIGHTS = {
  audience: 0.4,
  growth: 0.3,
  activity: 0.2,
  diversity: 0.1,
} as const;

/**
 * Compute audience score (0–100) from total follower count.
 * Uses log10 scale: 10 followers → ~14, 100K → ~70, 10M → ~100
 */
export function computeAudienceScore(totalFollowers: number): number {
  if (totalFollowers <= 0) return 0;
  // log10(10M) ≈ 7 → cap at 7 for 100 score
  const raw = Math.log10(Math.max(totalFollowers, 1)) / 7;
  return Math.min(100, Math.round(raw * 100 * 10) / 10);
}

/**
 * Compute growth score (0–100) from monthly growth rate (decimal).
 * 0% growth → 0, 10%+ monthly growth → ~100
 */
export function computeGrowthScore(monthlyGrowthRate: number): number {
  if (monthlyGrowthRate <= 0) return 0;
  // 10% monthly = excellent; cap at 20% for max score
  const capped = Math.min(monthlyGrowthRate, 0.2);
  return Math.min(100, Math.round((capped / 0.2) * 100 * 10) / 10);
}

/**
 * Compute activity score (0–100) from snapshot density.
 * @param snapshotCount  — number of snapshots in last 30 days
 * @param expectedMax    — expected max snapshots (default 30*5=150 for 5 platforms synced daily)
 */
export function computeActivityScore(
  snapshotCount: number,
  expectedMax = 150
): number {
  if (snapshotCount <= 0) return 0;
  const ratio = Math.min(snapshotCount / expectedMax, 1);
  return Math.round(ratio * 100 * 10) / 10;
}

/**
 * Compute diversity score (0–100) from number of active platforms.
 * 1 platform → 20, 5 platforms → 100
 */
export function computeDiversityScore(activePlatformCount: number): number {
  const maxPlatforms = 5;
  const capped = Math.min(activePlatformCount, maxPlatforms);
  return Math.round((capped / maxPlatforms) * 100 * 10) / 10;
}

export interface ScoreInputs {
  totalFollowers: number;
  monthlyGrowthRate: number;
  snapshotCount30Days: number;
  activePlatformCount: number;
}

export interface ScoreBreakdown {
  audience_score: number;
  growth_score: number;
  activity_score: number;
  diversity_score: number;
  final_score: number;
}

/**
 * Compute full SAHA Score breakdown from raw inputs.
 */
export function computeSAHAScore(inputs: ScoreInputs): ScoreBreakdown {
  const audience_score = computeAudienceScore(inputs.totalFollowers);
  const growth_score = computeGrowthScore(inputs.monthlyGrowthRate);
  const activity_score = computeActivityScore(inputs.snapshotCount30Days);
  const diversity_score = computeDiversityScore(inputs.activePlatformCount);

  const final_score =
    Math.round(
      (WEIGHTS.audience * audience_score +
        WEIGHTS.growth * growth_score +
        WEIGHTS.activity * activity_score +
        WEIGHTS.diversity * diversity_score) *
        10
    ) / 10;

  return {
    audience_score,
    growth_score,
    activity_score,
    diversity_score,
    final_score,
  };
}
