export type ApprovalStatus = "pending" | "approved" | "rejected";
export type UserRole = "creator" | "brand" | "admin";
export type PlatformId = "twitch" | "youtube" | "tiktok" | "instagram" | "kick";
export type RankingScope = "kuwait" | "gcc";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  creator_id: string | null;
  created_at: string;
}

export interface Creator {
  id: string;
  handle: string;
  name_en: string;
  name_ar: string;
  bio_en: string | null;
  bio_ar: string | null;
  avatar_url: string | null;
  country_code: string;
  genres: string[];
  is_verified: boolean;
  is_featured: boolean;
  is_live: boolean;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatorPlatform {
  id: string;
  creator_id: string;
  platform: PlatformId;
  platform_user_id: string;
  platform_username: string;
  followers: number;
  is_live: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface CreatorSnapshot {
  id: string;
  creator_id: string;
  platform: PlatformId;
  followers: number;
  taken_at: string;
}

export interface CreatorScore {
  id: string;
  creator_id: string;
  audience_score: number;
  growth_score: number;
  activity_score: number;
  diversity_score: number;
  final_score: number;
  computed_at: string;
}

export interface Ranking {
  id: string;
  creator_id: string;
  scope: RankingScope;
  country_code: string | null;
  rank: number;
  score: number;
  computed_at: string;
}

export interface SpotlightCreator {
  id: string;
  creator_id: string;
  position: number;
  active: boolean;
  created_at: string;
}

export interface SavedList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface SavedListItem {
  id: string;
  list_id: string;
  creator_id: string;
  added_at: string;
}

// ─────────────────────────────────────────────────────────────────
// ANALYTICS v2 — new score & rank history tables
// ─────────────────────────────────────────────────────────────────

export type MomentumLabel =
  | "Cooling Down"
  | "Stable"
  | "Building Momentum"
  | "Rising Fast"
  | "Exploding";

export interface CreatorDailyScore {
  id: number;
  creator_id: string;
  saha_score: number;
  growth_score: number;
  momentum_score: number;
  consistency_score: number;
  presence_score: number;
  rank_score: number;
  rank_country: number | null;
  rank_arab_world: number | null;
  rank_genre: number | null;
  primary_genre: string | null;
  calculated_date: string;
  created_at: string;
}

export interface CreatorRankSnapshot {
  id: number;
  creator_id: string;
  country: string | null;
  primary_genre: string | null;
  rank_country: number | null;
  rank_arab_world: number | null;
  rank_genre: number | null;
  total_followers: number;
  saha_score: number;
  snapshot_date: string;
  created_at: string;
}

export interface CreatorGrowth {
  creator_id: string;
  period: "1d" | "7d" | "30d" | "90d";
  followers_start: number;
  followers_end: number;
  computed_at: string;
}

/* Enriched view types — joined across tables */
export interface CreatorWithStats extends Creator {
  platforms: CreatorPlatform[];
  score: CreatorScore | null;
  kuwait_rank: number | null;
  gcc_rank: number | null;
  total_followers: number;
}

export interface RankingRow {
  rank: number;
  creator: CreatorWithStats;
}
