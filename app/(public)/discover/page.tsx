import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { HeaderPublic } from "@/components/layout/header-public";
import { DiscoverFilters } from "./discover-filters";
import { DiscoverTable } from "./discover-table";
import type { CreatorWithStats } from "@/lib/types";

interface SearchParams {
  q?: string;
  country?: string;
  platform?: string;
  live?: string;
  sort?: string;
}

interface DiscoverPageProps {
  searchParams: Promise<SearchParams>;
}

async function fetchCreators(filters: SearchParams): Promise<CreatorWithStats[]> {
  const supabase = await createClient();

  let query = supabase
    .from("creators")
    .select(
      `
      *,
      platforms:creator_platforms(*),
      score:creator_scores(*)
      `
    )
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.country) {
    query = query.eq("country_code", filters.country);
  }
  if (filters.live === "1") {
    query = query.eq("is_live", true);
  }
  if (filters.q) {
    query = query.or(
      `name_en.ilike.%${filters.q}%,name_ar.ilike.%${filters.q}%,handle.ilike.%${filters.q}%`
    );
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Enrich with total followers and ranks
  const enriched: CreatorWithStats[] = (data as CreatorWithStats[]).map((c) => {
    const total_followers = (c.platforms ?? []).reduce(
      (sum, p) => sum + (p.followers ?? 0),
      0
    );
    return { ...c, total_followers, kuwait_rank: null, gcc_rank: null };
  });

  // Client-side sort
  const sort = filters.sort ?? "score";
  return enriched.sort((a, b) => {
    if (sort === "followers") return b.total_followers - a.total_followers;
    if (sort === "growth") return 0; // growth sort requires snapshot data
    return (b.score?.final_score ?? 0) - (a.score?.final_score ?? 0);
  });
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const filters = await searchParams;
  const creators = await fetchCreators(filters);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderPublic />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl text-[#F5EFE0]">
              Discover Creators
            </h1>
            <p className="text-xs text-[#A7A0B8] mt-1 uppercase tracking-widest">
              {creators.length} creators
            </p>
          </div>
        </div>

        {/* Filters */}
        <DiscoverFilters currentFilters={filters} />

        {/* Table */}
        <Suspense fallback={<TableSkeleton />}>
          <DiscoverTable creators={creators} />
        </Suspense>
      </main>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="border border-[#2A263A] mt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-12 border-b border-[#2A263A] bg-[#0F1118] animate-pulse"
        />
      ))}
    </div>
  );
}
