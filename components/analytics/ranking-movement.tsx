interface RankingMovementProps {
  rankChange: number;
  genreRank: number;
  genreLabel: string;
  percentile: number;
}

function PercentileRing({ value }: { value: number }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-label={`${value}% percentile`}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#2A263A"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
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
      <span className="absolute font-serif text-[#F5EFE0] text-sm font-medium">
        {value}%
      </span>
    </div>
  );
}

export function RankingMovement({
  rankChange,
  genreRank,
  genreLabel,
  percentile,
}: RankingMovementProps) {
  return (
    <div className="border border-[#2A263A] bg-[#0F1118] p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-medium text-[#F5EFE0]">Ranking Movement</h2>
        <p className="text-xs text-[#A7A0B8] mt-0.5" dir="rtl">
          حركة الترتيب
        </p>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-3 gap-4 divide-x divide-[#2A263A]">
        {/* Column 1: Rank change */}
        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[#3FB950] text-2xl leading-none">↑</span>
            <span className="font-serif text-4xl text-[#3FB950] leading-none">
              {Math.abs(rankChange)}
            </span>
          </div>
          <p className="text-xs text-[#F5EFE0] mt-1">places this week</p>
          <p className="text-[10px] text-[#A7A0B8]" dir="rtl">
            مراكز هذا الأسبوع
          </p>
        </div>

        {/* Column 2: Genre rank */}
        <div className="flex flex-col items-center text-center gap-1 pl-4">
          <span className="font-serif text-4xl text-[#F4A52C] leading-none">
            #{genreRank}
          </span>
          <p className="text-xs text-[#F5EFE0] mt-1">{genreLabel}</p>
          <p className="text-[10px] text-[#A7A0B8] text-center" dir="rtl">
            في تصنيف {genreLabel} بالكويت
          </p>
        </div>

        {/* Column 3: Percentile ring */}
        <div className="flex flex-col items-center text-center gap-1 pl-4">
          <PercentileRing value={percentile} />
          <p className="text-xs text-[#F5EFE0]">Outperforming of creators</p>
          <p className="text-[10px] text-[#A7A0B8]" dir="rtl">
            يتفوق على المبدعين
          </p>
        </div>
      </div>
    </div>
  );
}
