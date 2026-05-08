export interface Platform {
  id: string;
  label: string;
  color: string;
  iconName: string;
}

export const PLATFORMS: Platform[] = [
  { id: "twitch", label: "Twitch", color: "#9146FF", iconName: "twitch" },
  { id: "youtube", label: "YouTube", color: "#FF0000", iconName: "youtube" },
  { id: "tiktok", label: "TikTok", color: "#010101", iconName: "music-2" },
  { id: "instagram", label: "Instagram", color: "#E1306C", iconName: "instagram" },
  { id: "kick", label: "Kick", color: "#53FC18", iconName: "tv" },
];

export const PLATFORM_MAP = new Map<string, Platform>(
  PLATFORMS.map((p) => [p.id, p])
);

export function getPlatform(id: string): Platform | undefined {
  return PLATFORM_MAP.get(id);
}
