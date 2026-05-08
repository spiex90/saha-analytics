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
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#2A263A"
          strokeWidth={strokeWidth}
        />
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
      <div className="mb-4 pb-3 border-b border-[#2A263A] flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#A7A0B8]">
            Index Movement
          </h2>
          <p className="text-[10px] font-mono text-[#4A4560] mt-0.5" dir="rtl">
            حركة الترتيب · DELTA
          </p>
        </div>
        <span className="text-[9px] font-mono tracking-widest text-[#4A4560]">
          AS OF TODAY
        </span>
      </div>

      {/* Three stat columns */}
      <div className="grid grid-cols-3">
        {/* Column 1: Rank delta */}
        <div className="flex flex-col items-center text-center gap-1 pr-4">
          <p className="text-[9px] font-mono tracking-widest text-[#4A4560] mb-1">RANK.DELTA</p>
          <div className="flex items-baseline gap-1">
            <span className="text-[#3FB950] text-base font-mono leading-none">▲</span>
            <span className="font-serif text-5xl text-[#F5EFE0] leading-none tabular-nums">
              {Math.abs(rankChange)}
            </span>
          </div>
          <p className="text-[9px] font-mono tracking-widest text-[#4A4560] mt-1 uppercase">PLACES</p>
          <p className="text-[9px] font-mono tracking-widest text-[#4A4560] uppercase">THIS WEEK</p>
          <p className="text-[9px] font-mono text-[#3FB950] mt-1" dir="rtl">
            تحسن هذا الأسبوع
          </p>
        </div>

        {/* Column 2: Genre rank */}
        <div className="flex flex-col items-center text-center gap-1 border-l border-[#2A263A] px-4">
          <p className="text-[9px] font-mono tracking-widest text-[#4A4560] mb-1">GENRE.RNK</p>
          <span className="font-serif text-5xl text-[#F4A52C] leading-none tabular-nums">
            #{genreRank}
          </span>
          <p className="text-[10px] font-mono text-[#F5EFE0] mt-1 uppercase tracking-widest">{genreLabel} KW</p>
          <p className="text-[9px] font-mono text-[#4A4560]" dir="rtl">
            في تصنيف الكويت
          </p>
        </div>

        {/* Column 3: Percentile */}
        <div className="flex flex-col items-center text-center gap-1 border-l border-[#2A263A] pl-4">
          <p className="text-[9px] font-mono tracking-widest text-[#4A4560] mb-1">PERCENTILE</p>
          <PercentileRing value={percentile} />
          <p className="text-[9px] font-mono tracking-widest text-[#F5EFE0] mt-1 uppercase">Outperforming</p>
          <p className="text-[9px] font-mono text-[#4A4560]" dir="rtl">
            يتفوق على {percentile}%
          </p>
        </div>
      </div>
    </div>
  );
}
