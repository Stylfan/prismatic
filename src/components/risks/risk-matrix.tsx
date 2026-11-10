import { getTranslations } from "next-intl/server";
import { riskBand, SCALE } from "@/domain/risk";

/**
 * The 10 × 10 risk matrix: probability along the bottom, consequence up
 * the side, each open risk as its number in its cell. When a previous
 * assessment is given, an arrow shows where the risk has moved from. Drawn
 * as SVG so it prints and scales with the report.
 */

export type MatrixRisk = {
  id: string;
  number: number;
  probability: number;
  impact: number;
  /** Where it stood in the previous edition, if anywhere else. */
  previous?: { probability: number; impact: number } | null;
};

const CELL = 40;
const LEFT = 44;
const TOP = 8;
const SIZE = CELL * SCALE;

const BAND_FILL = {
  low: "color-mix(in srgb, var(--color-success) 14%, white)",
  medium: "color-mix(in srgb, var(--color-warning) 22%, white)",
  high: "color-mix(in srgb, var(--color-danger) 22%, white)",
};

export async function RiskMatrix({ risks }: { risks: MatrixRisk[] }) {
  const t = await getTranslations("risks.matrix");
  const cx = (p: number) => LEFT + (p - 0.5) * CELL;
  const cy = (i: number) => TOP + (SCALE - i + 0.5) * CELL;

  // Several risks in one cell are spread around its centre.
  const byCell = new Map<string, MatrixRisk[]>();
  for (const r of risks) {
    const key = `${r.probability}:${r.impact}`;
    byCell.set(key, [...(byCell.get(key) ?? []), r]);
  }
  const offset = (n: number, count: number) => {
    if (count === 1) return { dx: 0, dy: 0 };
    const angle = (2 * Math.PI * n) / count;
    return { dx: Math.cos(angle) * 10, dy: Math.sin(angle) * 10 };
  };

  return (
    <svg
      viewBox={`0 0 ${LEFT + SIZE + 8} ${TOP + SIZE + 44}`}
      role="img"
      aria-labelledby="risk-matrix-title"
      className="w-full max-w-[480px]"
    >
      <title id="risk-matrix-title">{t("title")}</title>
      <defs>
        <marker
          id="risk-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-ink)" />
        </marker>
      </defs>
      {Array.from({ length: SCALE }, (_, row) =>
        Array.from({ length: SCALE }, (_, col) => {
          const p = col + 1;
          const i = SCALE - row;
          return (
            <rect
              key={`${p}:${i}`}
              x={LEFT + col * CELL}
              y={TOP + row * CELL}
              width={CELL}
              height={CELL}
              fill={BAND_FILL[riskBand(p, i)]}
              stroke="white"
              strokeWidth="1.5"
            />
          );
        }),
      )}
      {Array.from({ length: SCALE }, (_, k) => (
        <g key={k} fontSize="10" fill="var(--color-slate)">
          <text x={LEFT - 8} y={cy(k + 1) + 3} textAnchor="end">
            {k + 1}
          </text>
          <text x={cx(k + 1)} y={TOP + SIZE + 14} textAnchor="middle">
            {k + 1}
          </text>
        </g>
      ))}
      <text
        x={LEFT + SIZE / 2}
        y={TOP + SIZE + 34}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--color-ink)"
      >
        {t("probability")}
      </text>
      <text
        x={12}
        y={TOP + SIZE / 2}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="var(--color-ink)"
        transform={`rotate(-90 12 ${TOP + SIZE / 2})`}
      >
        {t("impact")}
      </text>
      {risks
        .filter(
          (r) =>
            r.previous &&
            (r.previous.probability !== r.probability || r.previous.impact !== r.impact),
        )
        .map((r) => (
          <line
            key={`arrow-${r.id}`}
            x1={cx(r.previous!.probability)}
            y1={cy(r.previous!.impact)}
            x2={cx(r.probability)}
            y2={cy(r.impact)}
            stroke="var(--color-ink)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
            markerEnd="url(#risk-arrow)"
          />
        ))}
      {[...byCell.values()].flatMap((group) =>
        group.map((r, n) => {
          const { dx, dy } = offset(n, group.length);
          return (
            <g key={r.id}>
              <circle
                cx={cx(r.probability) + dx}
                cy={cy(r.impact) + dy}
                r="10"
                fill="var(--color-ink)"
              />
              <text
                x={cx(r.probability) + dx}
                y={cy(r.impact) + dy + 3.5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="var(--color-paper)"
              >
                {r.number}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
