import Link from "next/link";
import { HeaderPublic } from "@/components/layout/header-public";

interface StatItem {
  label: string;
  value: string;
  accent?: boolean;
}

const STATS: StatItem[] = [
  { label: "Creators Tracked", value: "142" },
  { label: "Live Right Now", value: "12", accent: true },
  { label: "Countries Covered", value: "4" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderPublic />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Hero */}
        <div className="max-w-3xl w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-5xl md:text-7xl text-[#F5EFE0] tracking-tight">
              SAHA Analytics
            </h1>
            <p
              className="font-serif text-2xl md:text-3xl text-[#A7A0B8]"
              dir="rtl"
              lang="ar"
            >
              تحليلات سَاحة
            </p>
          </div>

          <p className="text-[#A7A0B8] max-w-xl mx-auto leading-relaxed tracking-widest uppercase text-xs font-medium pt-2">
            Arab Creator Intelligence Platform
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/discover"
              className="inline-flex items-center justify-center h-11 px-8 bg-[#F4A52C] text-[#0B0A12] font-semibold text-sm tracking-wide hover:bg-[#e8971f] transition-colors"
            >
              Discover Creators
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-8 border border-[#2A263A] text-[#F5EFE0] text-sm tracking-wide hover:border-[#F4A52C] hover:text-[#F4A52C] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-20 w-full max-w-2xl border border-[#2A263A] divide-x divide-[#2A263A] flex">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex-1 px-6 py-5 text-center">
              <div
                className={`font-serif text-3xl font-medium flex items-center justify-center gap-2 ${
                  stat.accent ? "text-[#FF3B3B]" : "text-[#F5EFE0]"
                }`}
              >
                {stat.value}
                {stat.accent && (
                  <span className="inline-block w-2 h-2 bg-[#FF3B3B] rounded-full live-pulse" />
                )}
              </div>
              <div className="text-[#A7A0B8] text-xs uppercase tracking-widest mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#2A263A] py-6 px-6 text-center text-[#A7A0B8] text-xs">
        <span>SAHA &copy; {new Date().getFullYear()}</span>
        <span className="mx-3 text-[#2A263A]">|</span>
        <span dir="rtl" lang="ar">
          منصة اكتشاف المبدعين العرب
        </span>
      </footer>
    </div>
  );
}
