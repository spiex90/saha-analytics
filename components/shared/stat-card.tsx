import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "border border-[#2A263A] bg-[#0F1118] px-5 py-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-[#A7A0B8] uppercase tracking-widest mb-2">
            {label}
          </div>
          <div className="font-serif text-2xl text-[#F5EFE0] font-medium leading-none">
            {value}
          </div>
          {delta !== undefined && (
            <div
              className={cn(
                "text-xs mt-2 font-medium",
                deltaPositive === false
                  ? "text-[#FF3B3B]"
                  : "text-[#3FB950]"
              )}
            >
              {delta}
            </div>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-[#A7A0B8]" />
          </div>
        )}
      </div>
    </div>
  );
}
