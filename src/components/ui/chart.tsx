/**
 * ダッシュボードのグラフ。
 *
 * グラフ用のライブラリは入れず、SVGを自前で描いている。
 * Cloudflare Workers にはスクリプトサイズの上限があり、
 * この程度の表現のために数十KBの依存を足したくないため。
 *
 * 色は画面側と同じテーマ変数（app.css の @theme）を直接参照しているので、
 * 配色を変えたときはグラフも一緒に変わる。
 */

/** 金額の軸ラベル。桁が大きいときは「万」でまとめて読みやすくする */
function formatAxisValue(value: number) {
  if (value >= 10000) {
    const man = Math.round((value / 10000) * 10) / 10;
    return `${man}万`;
  }
  return value.toLocaleString();
}

/** 目盛りの上限を、切りの良い数字まで切り上げる */
function niceCeil(value: number) {
  if (value <= 0) return 1;
  const digits = Math.floor(Math.log10(value));
  const unit = 10 ** digits;
  return Math.ceil(value / unit) * unit;
}

/**
 * 売上推移のエリアチャート。
 * 値が全て0でも軸と枠は出し、「データが無い」ことが分かるようにしている。
 */
export function AreaChart({
  points,
}: {
  points: { label: string; value: number }[];
}) {
  // SVGは幅いっぱいまで拡大・縮小されるため、viewBoxの寸法を実際の表示幅
  // （ダッシュボードでは350〜450px程度）に近づけておく。600のような大きな値にすると、
  // 文字だけが同じ比率で縮んで軸ラベルが読めなくなる。
  const width = 380;
  const height = 140;
  const padding = { top: 10, right: 8, bottom: 20, left: 38 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const max = niceCeil(Math.max(...points.map((p) => p.value), 0));
  const stepX =
    points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;

  const x = (index: number) =>
    points.length > 1
      ? padding.left + index * stepX
      : padding.left + innerWidth / 2;
  const y = (value: number) =>
    padding.top + innerHeight - (value / max) * innerHeight;

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1)} ${padding.top + innerHeight} L ${x(0)} ${padding.top + innerHeight} Z`;

  // 目盛りは0・中間・上限の3本だけ。線が多いと数字より目立ってしまうため
  const ticks = [0, max / 2, max];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="月別の請求金額の推移"
    >
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-accent)"
            stopOpacity="0.28"
          />
          <stop
            offset="100%"
            stopColor="var(--color-accent)"
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>

      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={padding.left}
            y1={y(tick)}
            x2={width - padding.right}
            y2={y(tick)}
            stroke="var(--color-line)"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-ink-faint)"
          >
            {formatAxisValue(tick)}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#area-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((point, index) => (
        <g key={point.label}>
          <circle
            cx={x(index)}
            cy={y(point.value)}
            r="3"
            fill="var(--color-surface)"
            stroke="var(--color-accent)"
            strokeWidth="2"
          />
          <text
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-ink-faint)"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export type DonutSegment = {
  label: string;
  value: number;
  /** CSS変数名で色を指定する（例: "var(--color-accent)"） */
  color: string;
};

/**
 * 内訳のドーナツグラフ。
 * 中央には「いちばん知りたい1つの数字」だけを置く。
 */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  const size = 150;
  const radius = 56;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-[150px] w-[150px] shrink-0"
        role="img"
        aria-label={centerLabel}
      >
        {/* 土台の円。件数が0のときもドーナツの形が見えるようにする */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-raised)"
          strokeWidth={strokeWidth}
        />

        {total > 0 &&
          segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const dash = `${length} ${circumference - length}`;
            // -90度回して真上から始める（時計回りに読めるようにするため）
            const element = (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += length;
            return element;
          })}

        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fontSize="30"
          fontWeight="900"
          fill="var(--color-ink)"
        >
          {centerValue}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 18}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-ink-faint)"
        >
          {centerLabel}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate text-ink-muted">
              {segment.label}
            </span>
            <span className="font-bold tabular-nums">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
