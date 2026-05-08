import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Twitch profile images
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
      // YouTube channel art
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      // TikTok avatars
      { protocol: "https", hostname: "p16-sign-va.tiktokcdn.com" },
      { protocol: "https", hostname: "p77-sign-va.tiktokcdn.com" },
      // Instagram CDN
      { protocol: "https", hostname: "*.cdninstagram.com" },
      // Kick avatars
      { protocol: "https", hostname: "files.kick.com" },
    ],
  },
};

export default nextConfig;
