/**
 * Format a follower count to a human-readable string.
 * e.g. 123456 → "123.5K", 1234567 → "1.2M"
 */
export function formatFollowers(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Format a SAHA score to one decimal place.
 * e.g. 87.3456 → "87.3"
 */
export function formatScore(score: number): string {
  return score.toFixed(1);
}

/**
 * Format a growth rate (decimal) to a percentage string with sign.
 * e.g. 0.052 → "+5.2%", -0.01 → "-1.0%"
 */
export function formatGrowth(rate: number): string {
  const pct = (rate * 100).toFixed(1);
  return rate >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Return a relative time string.
 * e.g. new Date(Date.now() - 3 * 60 * 60 * 1000) → "3h ago"
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
