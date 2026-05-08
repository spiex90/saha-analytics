import { formatScore } from "@/lib/utils/format";

interface SAHAScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function SAHAScoreRing({
  score,
  size = 64,
  strokeWidth = 4,
  className = "",
}: SAHAScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-label={`SAHA Score: ${formatScore(score)}`}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#2A263A"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#F4A52C"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      {/* Score label */}
      <span
        className="absolute font-serif text-[#F5EFE0] font-medium leading-none"
        style={{ fontSize: size * 0.22 }}
      >
        {Math.round(clampedScore)}
      </span>
    </div>
  );
}
