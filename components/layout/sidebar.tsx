"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Search,
  Trophy,
  Bookmark,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/discover?sort=rank", label: "Rankings", icon: Trophy },
  { href: "/brand/lists", label: "Lists", icon: Bookmark, roles: ["brand"] },
  { href: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin"] },
];

interface SidebarProps {
  role?: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-[#2A263A] bg-[#0F1118] min-h-screen">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#2A263A]">
          <Link
            href="/dashboard"
            className="font-serif text-lg text-[#F5EFE0] hover:text-[#F4A52C] transition-colors"
          >
            SAHA<span className="text-[#F4A52C]">.</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "text-[#F4A52C] bg-[#19162A]"
                    : "text-[#A7A0B8] hover:text-[#F5EFE0] hover:bg-[#19162A]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2A263A] px-2 py-3">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#A7A0B8] hover:text-[#F5EFE0] hover:bg-[#19162A] transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-[#2A263A] bg-[#0F1118] flex z-50">
        {visibleItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                isActive
                  ? "text-[#F4A52C]"
                  : "text-[#A7A0B8]"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
