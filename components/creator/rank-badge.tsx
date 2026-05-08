import { cn } from "@/lib/utils/cn";

interface RankBadgeProps {
  rank: number;
  scope: "kuwait" | "gcc";
  countryFlag?: string;
  className?: string;
}

const SCOPE_LABELS = {
  kuwait: "KW",
  gcc: "GCC",
};

export function RankBadge({ rank, scope, countryFlag, className }: RankBadgeProps) {
  const isTopThree = rank <= 3;
  const flag = countryFlag ?? (scope === "kuwait" ? "🇰🇼" : "🌍");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 border",
        isTopThree
          ? "text-[#F4A52C] border-[#F4A52C]/40 bg-[#F4A52C]/5"
          : "text-[#A7A0B8] border-[#2A263A]",
        className
      )}
    >
      <span>{flag}</span>
      <span>#{rank}</span>
      <span className="text-[10px] opacity-70">{SCOPE_LABELS[scope]}</span>
    </span>
  );
}
