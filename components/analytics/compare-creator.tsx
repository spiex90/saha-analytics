"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { id: "twitch", label: "TWITCH" },
  { id: "youtube", label: "YOUTUBE" },
  { id: "tiktok", label: "TIKTOK" },
  { id: "instagram", label: "INSTAGRAM" },
  { id: "kick", label: "KICK" },
];

interface CompareCreatorProps {
  currentHandle: string;
  currentAvatarUrl?: string | null;
  currentName?: string;
  currentScore?: number;
  currentRank?: number;
  currentTopPlatform?: string;
}

function CreatorStat({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="border-t border-[#2A263A] pt-1.5 text-center">
      <p className="text-[8px] font-mono tracking-widest text-[#4A4560]">{label}</p>
      <p className="text-xs font-mono text-[#F5EFE0] tabular-nums mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

export function CompareCreator({
  currentHandle,
  currentAvatarUrl,
  currentName,
  currentScore,
  currentRank,
  currentTopPlatform,
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
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2A263A]">
        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#A7A0B8]">
            Rivalry Module
          </h2>
          <p className="text-[10px] font-mono text-[#4A4560] mt-0.5" dir="rtl">
            قارن مع منشئ آخر
          </p>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-[#4A4560]">
          HEAD-TO-HEAD
        </span>
      </div>

      {/* Matchup grid: current creator | VS | rival */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 mb-4">

        {/* LEFT — current creator */}
        <div className="border border-[#F4A52C]/30 bg-[#19162A] p-3 flex flex-col items-center text-center">
          <p className="text-[9px] font-mono tracking-widest text-[#F4A52C] mb-2">YOU</p>
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={currentHandle}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-[#F4A52C]/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#0F1118] ring-2 ring-[#F4A52C]/50 flex items-center justify-center">
              <span className="text-[#F4A52C] text-sm font-mono font-bold uppercase">
                {currentHandle.slice(0, 2)}
              </span>
            </div>
          )}
          <p className="font-serif text-sm text-[#F5EFE0] mt-2 leading-none truncate max-w-full">
            {currentName ?? currentHandle}
          </p>
          <p className="text-[10px] font-mono text-[#A7A0B8] mt-0.5">@{currentHandle}</p>
          <div className="grid grid-cols-3 gap-1 mt-3 w-full">
            <CreatorStat label="SCORE" value={currentScore} />
            <CreatorStat label="RNK.KW" value={currentRank != null ? `#${currentRank}` : undefined} />
            <CreatorStat label="LEAD" value={currentTopPlatform?.toUpperCase().slice(0,3)} />
          </div>
        </div>

        {/* VS divider */}
        <div className="flex flex-col items-center justify-center px-1 gap-1">
          <span className="font-serif text-3xl text-[#F4A52C] leading-none tabular-nums">VS</span>
          <span className="text-[9px] font-mono text-[#4A4560] tracking-widest">MATCH</span>
        </div>

        {/* RIGHT — rival slot */}
        <div className="border border-dashed border-[#2A263A] bg-[#0B0A12] p-3 flex flex-col items-center text-center">
          <p className="text-[9px] font-mono tracking-widest text-[#A7A0B8] mb-2">RIVAL</p>
          <div className="w-12 h-12 rounded-full bg-[#19162A] border border-dashed border-[#2A263A] flex items-center justify-center">
            <span className="text-[#4A4560] text-xl leading-none font-mono">?</span>
          </div>
          <p className="font-serif text-sm text-[#4A4560] mt-2 leading-none">
            {compareHandle ? `@${compareHandle}` : "—"}
          </p>
          <input
            type="text"
            value={compareHandle}
            onChange={(e) => setCompareHandle(e.target.value)}
            placeholder="@handle"
            className="mt-2 w-full h-7 px-2 bg-[#0F1118] border border-[#2A263A] text-[10px] font-mono text-[#F5EFE0] placeholder:text-[#4A4560] focus:outline-none focus:border-[#F4A52C] text-center transition-colors"
            onKeyDown={(e) => { if (e.key === "Enter") handleCompare(); }}
          />
          <div className="grid grid-cols-3 gap-1 mt-2 w-full">
            <CreatorStat label="SCORE" value={undefined} />
            <CreatorStat label="RNK.KW" value={undefined} />
            <CreatorStat label="LEAD" value={undefined} />
          </div>
        </div>
      </div>

      {/* Platform selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-mono tracking-widest text-[#4A4560] shrink-0">PLATFORM:</span>
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="flex-1 h-7 px-2 bg-[#0B0A12] border border-[#2A263A] text-[10px] font-mono text-[#F5EFE0] focus:outline-none focus:border-[#F4A52C] appearance-none cursor-pointer transition-colors"
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#0B0A12]">
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Rivalry CTA */}
      <button
        onClick={handleCompare}
        disabled={!compareHandle.trim()}
        className="mt-auto w-full h-10 bg-[#F4A52C] text-[#0B0A12] text-[11px] font-mono font-bold tracking-[0.2em] uppercase hover:bg-[#e0941f] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ▶ INITIATE RIVALRY
      </button>
    </div>
  );
}
