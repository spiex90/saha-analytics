"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { id: "twitch", label: "Twitch" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "kick", label: "Kick" },
];

interface CompareCreatorProps {
  currentHandle: string;
  currentAvatarUrl?: string | null;
}

export function CompareCreator({
  currentHandle,
  currentAvatarUrl,
}: CompareCreatorProps) {
  const [compareHandle, setCompareHandle] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("twitch");
  const router = useRouter();

  function handleCompare() {
    if (!compareHandle.trim()) return;
    router.push(
      `/discover?compare=${encodeURIComponent(compareHandle.trim())}&platform=${selectedPlatform}`
    );
  }

  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5 h-full flex flex-col">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-sm font-medium text-[#F5EFE0]">
          Compare with another creator
        </h2>
        <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
          قارن مع منشئ آخر
        </p>
      </div>

      {/* Creator row */}
      <div className="flex items-center gap-4 mb-5">
        {/* Current creator */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={currentHandle}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover border border-[#2A263A]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#19162A] border border-[#2A263A] flex items-center justify-center">
              <span className="text-[#A7A0B8] text-xs font-medium uppercase">
                {currentHandle.slice(0, 2)}
              </span>
            </div>
          )}
          <span className="text-xs text-[#A7A0B8]">@{currentHandle}</span>
        </div>

        {/* VS */}
        <div className="flex-1 flex items-center justify-center">
          <span className="font-serif text-xl text-[#F4A52C] font-medium">
            VS
          </span>
        </div>

        {/* Compare creator */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#0B0A12] border border-dashed border-[#2A263A] flex items-center justify-center">
            <span className="text-[#A7A0B8] text-lg leading-none">+</span>
          </div>
          <span className="text-xs text-[#A7A0B8]">
            {compareHandle ? `@${compareHandle}` : "?"}
          </span>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3 mt-auto">
        <input
          type="text"
          value={compareHandle}
          onChange={(e) => setCompareHandle(e.target.value)}
          placeholder="Enter creator handle..."
          className="w-full h-9 px-3 bg-[#0B0A12] border border-[#2A263A] text-sm text-[#F5EFE0] placeholder:text-[#A7A0B8] focus:outline-none focus:border-[#F4A52C] transition-colors"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCompare();
          }}
        />

        {/* Platform dropdown */}
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="w-full h-9 px-3 bg-[#0B0A12] border border-[#2A263A] text-sm text-[#F5EFE0] focus:outline-none focus:border-[#F4A52C] transition-colors appearance-none cursor-pointer"
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0B0A12]">
              {p.label}
            </option>
          ))}
        </select>

        {/* Compare button */}
        <button
          onClick={handleCompare}
          disabled={!compareHandle.trim()}
          className="w-full h-9 bg-[#F4A52C] text-[#0B0A12] text-sm font-medium tracking-wide hover:bg-[#e0941f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Compare الآن
        </button>
      </div>
    </div>
  );
}
