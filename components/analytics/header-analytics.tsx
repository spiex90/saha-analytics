"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/discover?live=true", label: "Live Now" },
  { href: "/discover?sort=rank", label: "Leaderboard" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/ar", label: "عربي" },
];

export function HeaderAnalytics() {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[#2A263A] bg-[#0B0A12] sticky top-0 z-40">
      <div className="max-w-[1240px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-lg text-[#F5EFE0] hover:text-[#F4A52C] transition-colors tracking-tight shrink-0"
        >
          SAHA<span className="text-[#F4A52C]">.</span>
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/dashboard/analytics"
                ? pathname === "/dashboard/analytics"
                : pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "px-3 py-1.5 text-sm border border-[#F4A52C] text-[#F4A52C] transition-colors"
                    : "px-3 py-1.5 text-sm text-[#A7A0B8] hover:text-[#F5EFE0] transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center justify-center h-8 px-4 border border-[#2A263A] text-[#F5EFE0] text-xs tracking-wide hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
          >
            Dashboard
          </Link>
          <button
            onClick={handleSignOut}
            className="h-8 px-4 border border-[#2A263A] text-[#A7A0B8] text-xs tracking-wide hover:border-[#FF3B3B] hover:text-[#FF3B3B] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
