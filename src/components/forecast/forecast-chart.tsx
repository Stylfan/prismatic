import { getTranslations } from "next-intl/server";
import type { ForecastView } from "@/lib/forecast-view";

/**
 * The forecast as a picture: delivered points so far as a solid line, the
 * three tempi from today on, and a dashed line per milestone at the scope
 * it has to reach. Drawn as plain SVG on the server; the tables beside it
 * carry the same numbers for anyone who cannot see the chart.
 */

const W = 1040;
const H = 380;
const PAD = { top: 24, right: 150, bottom: 44, left: 64 };

const COLORS = {
  actual: "var(--color-ink)",
  avg: "var(--color-technical)",
  low: "var(--color-danger)",
  high: "var(--color-success)",
  milestone: "var(--color-bronze-deep)",
  grid: "var(--color-hairline-soft)",
  text: "var(--color-slate)",
};

export async function ForecastChart({ view }: { view: ForecastView }) {
  const t = await getTranslations("forecast.chart");
  const { result, milestones, currentIndex, axisLabels } = view;
  if (!result.stats) return <p className="text-sm text-slate">{t("noData")}</p>;

  // Show until the low tempo has passed every milestone, at least two years ahead, at most ten.
  const lastNeeded = Math.max(
    currentIndex + 8,
    ...milestones.map((m) => {
      const f = result.milestones.find((x) => x.id === m.id);
      return f?.at.low ?? f?.at.avg ?? currentIndex;
    }),
  );
  const maxIndex = Math.min(lastNeeded + 1, currentIndex + 40);
  const points = result.series.filter((p) => p.index <= maxIndex);
  const top = Math.max(
    ...milestones.map((m) => m.threshold),
    ...points.map((p) => Math.max(p.actual ?? 0, p.high ?? 0)),
    1,
  );
  // A round step (1, 2, 2.5 or 5 times a power of ten) so the axis reads 0, 1.000, 2.000 …
  const raw = top / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const tickStep = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
  const tickCount = Math.ceil(top / tickStep);
  const yMax = tickStep * tickCount;

  const x = (i: number) => PAD.left + (i / Math.max(1, maxIndex)) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / yMax) * (H - PAD.top - PAD.bottom);
  const path = (key: "actual" | "low" | "avg" | "high") =>
    points
      .filter((p) => p[key] !== null)
      .map((p, n) => `${n === 0 ? "M" : "L"}${x(p.index).toFixed(1)},${y(p[key]!).toFixed(1)}`)
      .join(" ");

  const ticks = Array.from({ length: tickCount + 1 }, (_, k) => k * tickStep);
  const step = maxIndex > 16 ? 2 : 1;
  const fmt = (n: number) => n.toLocaleString("da-DK");

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="forecast-chart-title"
        className="w-full"
      >
        <title id="forecast-chart-title">{t("title")}</title>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
            <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill={COLORS.text}>
              {fmt(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: maxIndex + 1 }, (_, i) => i)
          .filter((i) => i % step === 0)
          .map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              fontSize="10"
              fill={COLORS.text}
            >
              {axisLabels[i] ?? ""}
            </text>
          ))}
        <line
          x1={x(currentIndex - 0.5)}
          x2={x(currentIndex - 0.5)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke={COLORS.text}
          strokeDasharray="2 4"
        />
        <text x={x(currentIndex - 0.5) + 6} y={PAD.top + 10} fontSize="11" fill={COLORS.text}>
          {t("today")}
        </text>
        {milestones.map((m) => (
          <g key={m.id}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(m.threshold)}
              y2={y(m.threshold)}
              stroke={COLORS.milestone}
              strokeDasharray="6 5"
              strokeWidth="1.25"
            />
            <text
              x={W - PAD.right + 8}
              y={y(m.threshold) + 4}
              fontSize="11"
              fill={COLORS.milestone}
              fontWeight="700"
            >
              {m.code} · {fmt(m.threshold)}
            </text>
          </g>
        ))}
        <path
          d={path("low")}
          fill="none"
          stroke={COLORS.low}
          strokeWidth="1.75"
          strokeDasharray="5 4"
        />
        <path
          d={path("high")}
          fill="none"
          stroke={COLORS.high}
          strokeWidth="1.75"
          strokeDasharray="5 4"
        />
        <path d={path("avg")} fill="none" stroke={COLORS.avg} strokeWidth="2.5" />
        <path d={path("actual")} fill="none" stroke={COLORS.actual} strokeWidth="2.5" />
        {points
          .filter((p) => p.actual !== null)
          .map((p) => (
            <circle key={p.index} cx={x(p.index)} cy={y(p.actual!)} r="3.5" fill={COLORS.actual} />
          ))}
      </svg>
      <figcaption className="flex flex-wrap gap-6 text-[12px] text-slate">
        {(
          [
            ["actual", t("actual")],
            ["avg", t("avg")],
            ["low", t("low")],
            ["high", t("high")],
          ] as const
        ).map(([key, text]) => (
          <span key={key} className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-6"
              style={{ background: COLORS[key] }}
              aria-hidden
            />
            {text}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-6 border-t-2 border-dashed"
            style={{ borderColor: COLORS.milestone }}
            aria-hidden
          />
          {t("milestones")}
        </span>
      </figcaption>
    </figure>
  );
}
