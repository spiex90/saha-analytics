interface LiveIndicatorProps {
  isLive: boolean;
  className?: string;
}

export function LiveIndicator({ isLive, className = "" }: LiveIndicatorProps) {
  if (!isLive) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 text-xs font-semibold text-[#FF3B3B] border border-[#FF3B3B]/40 ${className}`}
    >
      <span className="inline-block w-1.5 h-1.5 bg-[#FF3B3B] rounded-full live-pulse" />
      LIVE
    </span>
  );
}
