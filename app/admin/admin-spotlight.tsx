"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface SpotlightRow {
  id: string;
  position: number;
  active: boolean;
  creator: {
    id: string;
    name_en: string;
    handle: string;
  };
}

export function AdminSpotlight() {
  const [spots, setSpots] = useState<SpotlightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpots = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("spotlight_creators")
      .select("*, creator:creators(id, name_en, handle)")
      .order("position", { ascending: true });
    setSpots((data as SpotlightRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSpots();
  }, [fetchSpots]);

  async function toggleActive(id: string, active: boolean) {
    const supabase = createClient();
    await supabase
      .from("spotlight_creators")
      .update({ active: !active })
      .eq("id", id);
    await fetchSpots();
  }

  return (
    <section>
      <h2 className="font-serif text-lg text-[#F5EFE0] mb-4">
        Spotlight Management
      </h2>

      <div className="border border-[#2A263A] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A263A]">
              <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
                Position
              </th>
              <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
                Creator
              </th>
              <th className="text-right px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
                Active
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-[#A7A0B8] text-xs"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && spots.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-[#A7A0B8] text-xs"
                >
                  No spotlight entries.
                </td>
              </tr>
            )}
            {spots.map((spot) => (
              <tr
                key={spot.id}
                className="border-b border-[#2A263A] last:border-0"
              >
                <td className="px-4 py-3 text-sm text-[#A7A0B8] tabular-nums">
                  {spot.position}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-[#F5EFE0]">
                    {spot.creator?.name_en}
                  </div>
                  <div className="text-xs text-[#A7A0B8]">
                    @{spot.creator?.handle}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(spot.id, spot.active)}
                    className={`h-7 px-3 text-xs border transition-colors ${
                      spot.active
                        ? "border-[#3FB950]/40 text-[#3FB950] hover:bg-[#3FB950]/10"
                        : "border-[#2A263A] text-[#A7A0B8] hover:border-[#3D3652]"
                    }`}
                  >
                    {spot.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
