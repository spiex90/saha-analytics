"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/utils/format";
import type { Creator } from "@/lib/types";

export function AdminApprovals() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("creators")
      .select("*")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });
    setCreators((data as Creator[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  async function handleAction(creatorId: string, action: "approve" | "reject") {
    setActionLoading(creatorId);
    const endpoint = action === "approve" ? "/api/admin/approve" : "/api/admin/approve";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: creatorId, action }),
    });
    const json = await res.json() as { error?: string; message?: string };
    if (json.error) {
      setMessage(`Error: ${json.error}`);
    } else {
      setMessage(`Creator ${action}d successfully.`);
      await fetchPending();
    }
    setActionLoading(null);
  }

  async function handleSync(creatorId: string) {
    setActionLoading(`sync-${creatorId}`);
    const res = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator_id: creatorId }),
    });
    const json = await res.json() as { error?: string; message?: string };
    setMessage(json.error ? `Sync error: ${json.error}` : "Sync triggered.");
    setActionLoading(null);
  }

  return (
    <section>
      <h2 className="font-serif text-lg text-[#F5EFE0] mb-4">
        Pending Approvals
      </h2>

      {message && (
        <div className="border border-[#F4A52C]/40 bg-[#F4A52C]/5 px-3 py-2 text-xs text-[#F4A52C] mb-4">
          {message}
          <button
            className="ml-3 text-[#A7A0B8] hover:text-[#F5EFE0]"
            onClick={() => setMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="border border-[#2A263A] overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2A263A]">
              <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
                Handle
              </th>
              <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium hidden sm:table-cell">
                Country
              </th>
              <th className="text-left px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium hidden md:table-cell">
                Submitted
              </th>
              <th className="text-right px-4 py-3 text-xs text-[#A7A0B8] uppercase tracking-widest font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[#A7A0B8] text-xs"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && creators.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[#A7A0B8] text-xs"
                >
                  No pending approvals.
                </td>
              </tr>
            )}
            {creators.map((creator) => (
              <tr
                key={creator.id}
                className="border-b border-[#2A263A] last:border-0"
              >
                <td className="px-4 py-3 text-sm text-[#F5EFE0]">
                  @{creator.handle}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-[#F5EFE0]">{creator.name_en}</div>
                  <div
                    className="text-xs text-[#A7A0B8]"
                    dir="rtl"
                    lang="ar"
                  >
                    {creator.name_ar}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#A7A0B8] hidden sm:table-cell">
                  {creator.country_code}
                </td>
                <td className="px-4 py-3 text-xs text-[#A7A0B8] hidden md:table-cell">
                  {timeAgo(creator.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleAction(creator.id, "approve")}
                      disabled={actionLoading === creator.id}
                      className="h-7 px-3 text-xs border border-[#3FB950]/40 text-[#3FB950] hover:bg-[#3FB950]/10 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(creator.id, "reject")}
                      disabled={actionLoading === creator.id}
                      className="h-7 px-3 text-xs border border-[#FF3B3B]/40 text-[#FF3B3B] hover:bg-[#FF3B3B]/10 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleSync(creator.id)}
                      disabled={actionLoading === `sync-${creator.id}`}
                      className="h-7 px-3 text-xs border border-[#2A263A] text-[#A7A0B8] hover:border-[#F4A52C] hover:text-[#F4A52C] disabled:opacity-50 transition-colors"
                    >
                      Sync
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
