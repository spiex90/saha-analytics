"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { GCC_COUNTRIES } from "@/lib/constants/countries";
import { PLATFORMS } from "@/lib/constants/platforms";

interface DiscoverFiltersProps {
  currentFilters: {
    q?: string;
    country?: string;
    platform?: string;
    live?: string;
    sort?: string;
  };
}

const SORT_OPTIONS = [
  { value: "score", label: "SAHA Score" },
  { value: "followers", label: "Most Followed" },
  { value: "growth", label: "Fastest Growing" },
];

export function DiscoverFilters({ currentFilters }: DiscoverFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/discover?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
      {/* Search */}
      <input
        type="search"
        defaultValue={currentFilters.q ?? ""}
        placeholder="Search creators…"
        onChange={(e) => updateParam("q", e.target.value || null)}
        className="h-9 px-3 bg-[#0F1118] border border-[#2A263A] text-sm text-[#F5EFE0] placeholder:text-[#A7A0B8]/50 focus:outline-none focus:border-[#F4A52C] transition-colors w-full sm:w-56"
      />

      {/* Country filter */}
      <select
        value={currentFilters.country ?? ""}
        onChange={(e) => updateParam("country", e.target.value || null)}
        className="h-9 px-3 bg-[#0F1118] border border-[#2A263A] text-sm text-[#F5EFE0] focus:outline-none focus:border-[#F4A52C] transition-colors"
      >
        <option value="">All Countries</option>
        {GCC_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name_en}
          </option>
        ))}
      </select>

      {/* Platform filter */}
      <select
        value={currentFilters.platform ?? ""}
        onChange={(e) => updateParam("platform", e.target.value || null)}
        className="h-9 px-3 bg-[#0F1118] border border-[#2A263A] text-sm text-[#F5EFE0] focus:outline-none focus:border-[#F4A52C] transition-colors"
      >
        <option value="">All Platforms</option>
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      {/* Live toggle */}
      <button
        onClick={() =>
          updateParam("live", currentFilters.live === "1" ? null : "1")
        }
        className={`h-9 px-4 text-xs border transition-colors flex items-center gap-2 ${
          currentFilters.live === "1"
            ? "border-[#FF3B3B] text-[#FF3B3B] bg-[#FF3B3B]/5"
            : "border-[#2A263A] text-[#A7A0B8] hover:border-[#3D3652]"
        }`}
      >
        <span className="w-1.5 h-1.5 bg-current rounded-full live-pulse" />
        Live Now
      </button>

      {/* Sort buttons */}
      <div className="flex border border-[#2A263A] ml-auto">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam("sort", opt.value)}
            className={`h-9 px-3 text-xs border-r border-[#2A263A] last:border-r-0 transition-colors ${
              (currentFilters.sort ?? "score") === opt.value
                ? "text-[#F4A52C] bg-[#F4A52C]/5"
                : "text-[#A7A0B8] hover:text-[#F5EFE0]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
