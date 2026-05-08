// ─────────────────────────────────────────────────────────────────────────────
// SAHA Analytics — Production Badge Components
// Visual system: dark editorial · thin borders · minimal saffron · type-led
// Each badge is a pure scalable SVG — no images, no glow, no gradients
// ─────────────────────────────────────────────────────────────────────────────

const GOLD = "#F4A52C";
const TEXT_PRI = "#F5EFE0";
const TEXT_SEC = "#A7A0B8";
const BG = "#0B0A12";
const ELEV = "#19162A";
const BORDER = "#2A263A";

const CW = 200;
const CH = 248;

// ─── Shared primitives ───────────────────────────────────────────────────────

/** SAHA geometric mark: two overlapping squares (one rotated 45°) */
function SAHAMark({ cx, cy, s = 6 }: { cx: number; cy: number; s?: number }) {
  return (
    <g>
      <rect
        x={cx - s} y={cy - s} width={s * 2} height={s * 2}
        fill="none" stroke={GOLD} strokeWidth={0.65} opacity={0.75}
      />
      <rect
        x={cx - s} y={cy - s} width={s * 2} height={s * 2}
        fill="none" stroke={GOLD} strokeWidth={0.65} opacity={0.35}
        transform={`rotate(45 ${cx} ${cy})`}
      />
    </g>
  );
}

/** Thin gold divider with center diamond */
function Divider({ y, padX = 30 }: { y: number; padX?: number }) {
  const cx = CW / 2;
  return (
    <g>
      <line x1={padX} y1={y} x2={cx - 6} y2={y} stroke={GOLD} strokeWidth={0.5} opacity={0.4} />
      <path
        d={`M ${cx},${y - 4} L ${cx + 4},${y} L ${cx},${y + 4} L ${cx - 4},${y} Z`}
        fill={GOLD} opacity={0.45}
      />
      <line x1={cx + 6} y1={y} x2={CW - padX} y2={y} stroke={GOLD} strokeWidth={0.5} opacity={0.4} />
    </g>
  );
}

/** Standard SAHA header used by all badges */
function BadgeHeader({ y = 22 }: { y?: number }) {
  const cx = CW / 2;
  return (
    <>
      <SAHAMark cx={cx} cy={y} s={6} />
      <text
        x={cx} y={y + 14} textAnchor="middle"
        fill={TEXT_SEC} fontSize={7} fontFamily="Georgia, serif" letterSpacing={4}
      >
        SAHA
      </text>
    </>
  );
}

export interface BadgeProps {
  size?: number;
  className?: string;
}

function resolveSize(size?: number): { w: number; h: number } {
  const scale = (size ?? CW) / CW;
  return { w: Math.round(CW * scale), h: Math.round(CH * scale) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · FOUNDING CREATOR
// Shape: arch notch at top centre — "historic, rare, early-adopter"
// ─────────────────────────────────────────────────────────────────────────────
export function FoundingCreatorBadge({ size, className }: BadgeProps) {
  const { w, h } = resolveSize(size);
  const cx = CW / 2;
  const notch = `M 0,0 L ${cx - 22},0 Q ${cx},20 ${cx + 22},0 L ${CW},0 L ${CW},${CH} L 0,${CH} Z`;
  const notchIn = `M 6,6 L ${cx - 16},6 Q ${cx},24 ${cx + 16},6 L ${CW - 6},6 L ${CW - 6},${CH - 6} L 6,${CH - 6} Z`;

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${CW} ${CH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background & borders */}
      <path d={notch} fill={BG} />
      <path d={notch} fill="none" stroke={BORDER} strokeWidth={1} />
      <path d={notchIn} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.18} />

      {/* 4-corner crosshair marks */}
      {([[16, 26], [CW - 16, 26], [16, CH - 16], [CW - 16, CH - 16]] as [number, number][]).map(([x, y], i) => (
        <g key={i}>
          <line x1={x - 7} y1={y} x2={x + 7} y2={y} stroke={GOLD} strokeWidth={0.5} opacity={0.3} />
          <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke={GOLD} strokeWidth={0.5} opacity={0.3} />
        </g>
      ))}

      <BadgeHeader y={34} />
      <line x1={22} y1={52} x2={CW - 22} y2={52} stroke={BORDER} strokeWidth={0.5} />

      {/* Main title */}
      <text
        x={cx} y={98} textAnchor="middle"
        fill={TEXT_PRI} fontSize={27} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={2}
      >
        FOUNDING
      </text>
      <text
        x={cx} y={128} textAnchor="middle"
        fill={TEXT_PRI} fontSize={27} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={2}
      >
        CREATOR
      </text>

      <Divider y={143} padX={28} />

      <text
        x={cx} y={162} textAnchor="middle"
        fill={TEXT_SEC} fontSize={9} fontFamily="'Helvetica Neue', Arial, sans-serif"
        letterSpacing={1.5} fontWeight={300}
      >
        First 100 Creators
      </text>

      {/* Serial plate */}
      <rect x={62} y={178} width={76} height={22} fill={ELEV} />
      <rect x={62} y={178} width={76} height={22} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.3} />
      <text
        x={cx} y={194} textAnchor="middle"
        fill={GOLD} fontSize={11} fontFamily="'Courier New', monospace"
        letterSpacing={3} opacity={0.9}
      >
        001–100
      </text>

      <line x1={22} y1={CH - 10} x2={CW - 22} y2={CH - 10} stroke={BORDER} strokeWidth={0.5} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · SAHA VERIFIED
// Shape: rounded rectangle (pill corners) — "official identity"
// ─────────────────────────────────────────────────────────────────────────────
export function SAHAVerifiedBadge({ size, className }: BadgeProps) {
  const { w, h } = resolveSize(size);
  const cx = CW / 2;
  const R = 20;

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${CW} ${CH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width={CW} height={CH} rx={R} fill={BG} />
      <rect x={0.5} y={0.5} width={CW - 1} height={CH - 1} rx={R} fill="none" stroke={BORDER} strokeWidth={1} />
      <rect x={7} y={7} width={CW - 14} height={CH - 14} rx={R - 4} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.18} />

      <BadgeHeader y={22} />
      <line x1={22} y1={40} x2={CW - 22} y2={40} stroke={BORDER} strokeWidth={0.5} />

      {/* Concentric rings */}
      <circle cx={cx} cy={104} r={44} fill="none" stroke={BORDER} strokeWidth={1} />
      <circle cx={cx} cy={104} r={34} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.2} />

      {/* Checkmark — thin, editorial */}
      <polyline
        points={`${cx - 16},104 ${cx - 4},116 ${cx + 20},90`}
        fill="none" stroke={GOLD} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        opacity={0.9}
      />

      <text
        x={cx} y={166} textAnchor="middle"
        fill={TEXT_PRI} fontSize={25} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={4}
      >
        VERIFIED
      </text>

      <Divider y={177} padX={28} />

      <text
        x={cx} y={196} textAnchor="middle"
        fill={TEXT_SEC} fontSize={9} fontFamily="'Helvetica Neue', Arial, sans-serif"
        letterSpacing={1.5} fontWeight={300}
      >
        Verified Creator
      </text>

      {/* Shield glyph */}
      <path
        d={`M ${cx},${CH - 14} L ${cx - 6},${CH - 20} L ${cx - 6},${CH - 28} L ${cx + 6},${CH - 28} L ${cx + 6},${CH - 20} Z`}
        fill="none" stroke={GOLD} strokeWidth={0.6} opacity={0.35}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · TOP 10 KUWAIT
// Shape: shield (pointed bottom) — "national ranking prestige"
// ─────────────────────────────────────────────────────────────────────────────
export function Top10KuwaitBadge({ size, className }: BadgeProps) {
  const { w, h } = resolveSize(size);
  const cx = CW / 2;
  const shieldPath = `M 0,0 L ${CW},0 L ${CW},${CH - 52} L ${cx},${CH} L 0,${CH - 52} Z`;
  const shieldInner = `M 7,7 L ${CW - 7},7 L ${CW - 7},${CH - 56} L ${cx},${CH - 8} L 7,${CH - 56} Z`;

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${CW} ${CH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={shieldPath} fill={BG} />
      <path d={shieldPath} fill="none" stroke={BORDER} strokeWidth={1} />
      <path d={shieldInner} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.18} />

      <BadgeHeader y={22} />
      <line x1={22} y1={40} x2={CW - 22} y2={40} stroke={BORDER} strokeWidth={0.5} />

      {/* Rank */}
      <text
        x={cx} y={94} textAnchor="middle"
        fill={TEXT_PRI} fontSize={34} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={700} letterSpacing={1}
      >
        TOP 10
      </text>
      <text
        x={cx} y={124} textAnchor="middle"
        fill={GOLD} fontSize={22} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={5}
      >
        KUWAIT
      </text>

      <Divider y={136} padX={26} />

      <text
        x={cx} y={153} textAnchor="middle"
        fill={TEXT_SEC} fontSize={8} fontFamily="'Helvetica Neue', Arial, sans-serif"
        letterSpacing={2.5} fontWeight={300}
      >
        GAMING CREATORS
      </text>

      {/* Kuwait towers — minimal line silhouette */}
      <g transform={`translate(${cx}, 180)`} opacity={0.22} stroke={GOLD} strokeWidth={0.8} fill="none">
        {/* Ground */}
        <line x1={-42} y1={0} x2={42} y2={0} strokeWidth={0.5} />
        {/* Center tower with sphere */}
        <line x1={0} y1={-30} x2={0} y2={0} />
        <circle cx={0} cy={-24} r={5.5} />
        {/* Left tower */}
        <line x1={-20} y1={-22} x2={-20} y2={0} strokeWidth={0.7} />
        <circle cx={-20} cy={-18} r={4} />
        {/* Right tower */}
        <line x1={20} y1={-22} x2={20} y2={0} strokeWidth={0.7} />
        <circle cx={20} cy={-18} r={4} />
        {/* Background buildings */}
        <rect x={-38} y={-10} width={8} height={10} strokeWidth={0.5} />
        <rect x={30} y={-14} width={10} height={14} strokeWidth={0.5} />
      </g>

      {/* Bottom logo */}
      <SAHAMark cx={cx} cy={CH - 20} s={5} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · FASTEST GROWING
// Shape: diagonal cut top-right — "momentum, velocity"
// ─────────────────────────────────────────────────────────────────────────────
export function FastestGrowingBadge({ size, className }: BadgeProps) {
  const { w, h } = resolveSize(size);
  const cx = CW / 2;
  const cut = 36;
  const mainPath = `M 0,0 L ${CW - cut},0 L ${CW},${cut} L ${CW},${CH} L 0,${CH} Z`;
  const innerPath = `M 6,6 L ${CW - cut - 4},6 L ${CW - 6},${cut + 4} L ${CW - 6},${CH - 6} L 6,${CH - 6} Z`;

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${CW} ${CH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={mainPath} fill={BG} />
      <path d={mainPath} fill="none" stroke={BORDER} strokeWidth={1} />
      <path d={innerPath} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.18} />

      {/* Diagonal cut accent */}
      <line x1={CW - cut} y1={0} x2={CW} y2={cut} stroke={GOLD} strokeWidth={0.8} opacity={0.35} />

      {/* Arrow glyph top-right */}
      <g transform={`translate(${CW - 16}, 14)`} opacity={0.55} stroke={GOLD} strokeWidth={1} fill="none" strokeLinecap="round">
        <line x1={-6} y1={6} x2={0} y2={0} />
        <polyline points={`-4,0 0,0 0,4`} />
      </g>

      <BadgeHeader y={22} />
      <line x1={22} y1={40} x2={CW - 22} y2={40} stroke={BORDER} strokeWidth={0.5} />

      <text
        x={cx} y={96} textAnchor="middle"
        fill={TEXT_PRI} fontSize={26} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={2}
      >
        FASTEST
      </text>
      <text
        x={cx} y={126} textAnchor="middle"
        fill={TEXT_PRI} fontSize={26} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={2}
      >
        GROWING
      </text>

      <Divider y={140} padX={28} />

      <text
        x={cx} y={159} textAnchor="middle"
        fill={TEXT_SEC} fontSize={9} fontFamily="'Helvetica Neue', Arial, sans-serif"
        letterSpacing={1.5} fontWeight={300}
      >
        30-Day Momentum
      </text>

      {/* Trend line graphic */}
      <g transform={`translate(${cx - 38}, 170)`} opacity={0.35}>
        <polyline
          points="0,30 10,24 22,18 34,14 46,8 58,3 72,6"
          fill="none" stroke={GOLD} strokeWidth={1.2} strokeLinecap="round"
        />
        {/* Terminal dot */}
        <circle cx={72} cy={6} r={2} fill={GOLD} />
        {/* Baseline */}
        <line x1={0} y1={32} x2={76} y2={32} stroke={BORDER} strokeWidth={0.5} />
      </g>

      <line x1={22} y1={CH - 10} x2={CW - 22} y2={CH - 10} stroke={BORDER} strokeWidth={0.5} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · RISING CREATOR
// Shape: stepped top-left corner — "asymmetric, emerging"
// ─────────────────────────────────────────────────────────────────────────────
export function RisingCreatorBadge({ size, className }: BadgeProps) {
  const { w, h } = resolveSize(size);
  const cx = CW / 2;
  const step = 22;
  const mainPath = `M ${step},0 L ${CW},0 L ${CW},${CH} L 0,${CH} L 0,${step} Z`;
  const innerPath = `M ${step + 5},6 L ${CW - 6},6 L ${CW - 6},${CH - 6} L 6,${CH - 6} L 6,${step + 5} Z`;

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${CW} ${CH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={mainPath} fill={BG} />
      <path d={mainPath} fill="none" stroke={BORDER} strokeWidth={1} />
      <path d={innerPath} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.18} />

      {/* Step corner accent */}
      <line x1={0} y1={step} x2={step} y2={step} stroke={GOLD} strokeWidth={0.8} opacity={0.35} />
      <line x1={step} y1={0} x2={step} y2={step} stroke={GOLD} strokeWidth={0.8} opacity={0.35} />

      {/* Ascending dots — rising trajectory */}
      {([0, 1, 2, 3, 4] as number[]).map((i) => (
        <circle
          key={i}
          cx={28 + i * 13}
          cy={18 - i * 2.5}
          r={1.2}
          fill={GOLD}
          opacity={0.2 + i * 0.12}
        />
      ))}

      <BadgeHeader y={28} />
      <line x1={22} y1={46} x2={CW - 22} y2={46} stroke={BORDER} strokeWidth={0.5} />

      <text
        x={cx} y={100} textAnchor="middle"
        fill={TEXT_PRI} fontSize={27} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={2}
      >
        RISING
      </text>
      <text
        x={cx} y={130} textAnchor="middle"
        fill={TEXT_PRI} fontSize={27} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={400} letterSpacing={2}
      >
        CREATOR
      </text>

      <Divider y={144} padX={28} />

      <text
        x={cx} y={163} textAnchor="middle"
        fill={TEXT_SEC} fontSize={9} fontFamily="'Helvetica Neue', Arial, sans-serif"
        letterSpacing={1.5} fontWeight={300}
      >
        Emerging Talent
      </text>

      {/* Three ascending stars */}
      {([-1, 0, 1] as number[]).map((offset, i) => (
        <g
          key={i}
          transform={`translate(${cx + offset * 24}, ${CH - 32})`}
          opacity={0.15 + i * 0.14}
        >
          <path
            d="M 0,-6 L 1.5,-2 L 6,-2 L 2.5,1 L 3.8,5.5 L 0,3 L -3.8,5.5 L -2.5,1 L -6,-2 L -1.5,-2 Z"
            fill={GOLD}
          />
        </g>
      ))}

      <line x1={22} y1={CH - 10} x2={CW - 22} y2={CH - 10} stroke={BORDER} strokeWidth={0.5} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · SAHA ELITE
// Shape: octagonal (all 4 corners clipped) — "invitation only, ultra-premium"
// The restraint IS the luxury.
// ─────────────────────────────────────────────────────────────────────────────
export function SAHAEliteBadge({ size, className }: BadgeProps) {
  const { w, h } = resolveSize(size);
  const cx = CW / 2;
  const cut = 18;
  const octPath = [
    `M ${cut},0`, `L ${CW - cut},0`,
    `L ${CW},${cut}`, `L ${CW},${CH - cut}`,
    `L ${CW - cut},${CH}`, `L ${cut},${CH}`,
    `L 0,${CH - cut}`, `L 0,${cut}`, `Z`,
  ].join(" ");
  const octInner = [
    `M ${cut + 5},6`, `L ${CW - cut - 5},6`,
    `L ${CW - 6},${cut + 5}`, `L ${CW - 6},${CH - cut - 5}`,
    `L ${CW - cut - 5},${CH - 6}`, `L ${cut + 5},${CH - 6}`,
    `L 6,${CH - cut - 5}`, `L 6,${cut + 5}`, `Z`,
  ].join(" ");

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${CW} ${CH}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={octPath} fill={BG} />
      <path d={octPath} fill="none" stroke={BORDER} strokeWidth={1} />
      <path d={octInner} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.22} />

      {/* Gold dot at each of the 8 vertices */}
      {([
        [cut, 0], [CW - cut, 0],
        [CW, cut], [CW, CH - cut],
        [CW - cut, CH], [cut, CH],
        [0, CH - cut], [0, cut],
      ] as [number, number][]).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5} fill={GOLD} opacity={0.3} />
      ))}

      <SAHAMark cx={cx} cy={26} s={7} />
      <text
        x={cx} y={42} textAnchor="middle"
        fill={TEXT_SEC} fontSize={7} fontFamily="Georgia, serif" letterSpacing={5}
      >
        SAHA
      </text>
      <line x1={24} y1={50} x2={CW - 24} y2={50} stroke={BORDER} strokeWidth={0.5} />

      {/* Wide-tracked, very spaced — silence = prestige */}
      <text
        x={cx} y={104} textAnchor="middle"
        fill={TEXT_PRI} fontSize={28} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={300} letterSpacing={6}
      >
        SAHA
      </text>
      <text
        x={cx} y={136} textAnchor="middle"
        fill={GOLD} fontSize={28} fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={300} letterSpacing={6}
      >
        ELITE
      </text>

      <Divider y={150} padX={34} />

      <text
        x={cx} y={170} textAnchor="middle"
        fill={TEXT_SEC} fontSize={9} fontFamily="'Helvetica Neue', Arial, sans-serif"
        letterSpacing={2.5} fontWeight={300}
      >
        Invitation Only
      </text>

      {/* Concentric diamond motif — the emptiness speaks */}
      <g transform={`translate(${cx}, ${CH - 30})`} opacity={0.28}>
        <rect x={-10} y={-10} width={20} height={20} fill="none" stroke={GOLD} strokeWidth={0.6} transform="rotate(45)" />
        <rect x={-5} y={-5} width={10} height={10} fill="none" stroke={GOLD} strokeWidth={0.6} transform="rotate(45)" />
        <rect x={-1.5} y={-1.5} width={3} height={3} fill={GOLD} transform="rotate(45)" />
      </g>

      <line x1={24} y1={CH - 10} x2={CW - 24} y2={CH - 10} stroke={BORDER} strokeWidth={0.5} />
    </svg>
  );
}
