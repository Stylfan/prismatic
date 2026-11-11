import { getTranslations } from "next-intl/server";
import type { ForecastView } from "@/lib/forecast-view";

/**
 * The forecast as a picture, built like the steering group's slides: a bar
 * for what was delivered in each ended quarter, a solid line for the total
 * delivered, and the three tempi from there on as dashed lines, because
 * they are calculated, not measured. Each milestone is a thin solid line
 * with its name. The legend sits beside the chart. Plain SVG drawn on the
 * server; the tables below carry the same numbers for anyone who cannot
 * see the chart.
 */

const W = 820;
const H = 380;
const PAD = { top: 12, right: 160, bottom: 46, left: 52 };

const COLORS = {
  actual: "var(--color-ink)",
  bar: "var(--color-slate)",
  high: "var(--color-tempo-high)",
  avg: "var(--color-tempo-avg)",
  low: "var(--color-tempo-low)",
  milestone: "var(--color-slate)",
  grid: "var(--color-hairline-soft)",
  text: "var(--color-slate)",
};

const TEMPO_ORDER = ["high", "avg", "low"] as const;

export async function ForecastChart({ view }: { view: Omit<ForecastView, "rows"> }) {
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
  // The scale follows the milestones and what is delivered; the forecast lines
  // that climb past the last milestone are cut at the top of the chart.
  const top = Math.max(
    ...milestones.map((m) => m.threshold * 1.08),
    ...points.map((p) => p.actual ?? 0),
    1,
  );
  // A round step (1, 2, 2.5 or 5 times a power of ten) so the axis reads 0, 1.000, 2.000 …
  const raw = top / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const tickStep = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
  const tickCount = Math.ceil(top / tickStep);
  const yMax = tickStep * tickCount;

  const slot = (W - PAD.left - PAD.right) / (maxIndex + 1);
  const x = (i: number) => PAD.left + (i + 0.5) * slot;
  const y = (v: number) => H - PAD.bottom - (v / yMax) * (H - PAD.top - PAD.bottom);
  const path = (key: "actual" | "low" | "avg" | "high") =>
    points
      .filter((p) => p[key] !== null)
      .map((p, n) => `${n === 0 ? "M" : "L"}${x(p.index).toFixed(1)},${y(p[key]!).toFixed(1)}`)
      .join(" ");

  // What was delivered in each ended quarter: the step between running totals.
  const actuals = points.filter((p) => p.actual !== null);
  const bars = actuals.map((p, n) => ({
    index: p.index,
    value: p.actual! - (n === 0 ? 0 : actuals[n - 1]!.actual!),
  }));

  const ticks = Array.from({ length: tickCount + 1 }, (_, k) => k * tickStep);
  // Every quarter named while there is room, otherwise every other one.
  const step = maxIndex > 14 ? 2 : 1;
  const fmt = (n: number) => n.toLocaleString("da-DK");
  const barWidth = Math.min(28, slot * 0.6);

  // A quarter's name on two lines, the season over the year: "Vinter" / "2025/26".
  const axisLine = (label: string | undefined, line: 0 | 1) => {
    if (!label) return "";
    const cut = label.indexOf(" ");
    if (cut < 0) return line === 0 ? label : "";
    return line === 0 ? label.slice(0, cut) : label.slice(cut + 1);
  };

  const legend = [
    { key: "bar", text: t("perQuarter") },
    { key: "actual", text: t("actual") },
    ...TEMPO_ORDER.map((tempo) => ({ key: tempo, text: t(tempo) })),
  ] as const;

  return (
    <figure className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_11rem]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="forecast-chart-title"
        className="w-full"
      >
        <title id="forecast-chart-title">{t("title")}</title>
        <defs>
          <clipPath id="forecast-plot">
            <rect
              x={PAD.left}
              y={PAD.top}
              width={W - PAD.left - PAD.right}
              height={H - PAD.top - PAD.bottom}
            />
          </clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
            <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" fontSize="13" fill={COLORS.text}>
              {fmt(v)}
            </text>
          </g>
        ))}
        {Array.from({ length: maxIndex + 1 }, (_, i) => i)
          .filter((i) => i % step === 0)
          .map((i) => (
            <text key={i} x={x(i)} textAnchor="middle" fontSize="12" fill={COLORS.text}>
              <tspan x={x(i)} y={H - PAD.bottom + 18}>
                {axisLine(axisLabels[i], 0)}
              </tspan>
              <tspan x={x(i)} y={H - PAD.bottom + 34}>
                {axisLine(axisLabels[i], 1)}
              </tspan>
            </text>
          ))}
        {bars.map((b) => (
          <rect
            key={b.index}
            x={x(b.index) - barWidth / 2}
            y={y(b.value)}
            width={barWidth}
            height={Math.max(0, y(0) - y(b.value))}
            rx="2"
            fill={COLORS.bar}
            fillOpacity="0.35"
          />
        ))}
        {milestones.map((m) => (
          <g key={m.id}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(m.threshold)}
              y2={y(m.threshold)}
              stroke={COLORS.milestone}
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <text x={W - PAD.right + 8} y={y(m.threshold) + 4} fontSize="13" fill={COLORS.text}>
              {m.code}: {m.title}
            </text>
          </g>
        ))}
        {TEMPO_ORDER.map((tempo) => (
          <path
            key={tempo}
            d={path(tempo)}
            fill="none"
            clipPath="url(#forecast-plot)"
            stroke={COLORS[tempo]}
            strokeWidth={tempo === "avg" ? 2.25 : 2}
            strokeDasharray="6 4"
          />
        ))}
        <path d={path("actual")} fill="none" stroke={COLORS.actual} strokeWidth="2.5" />
        {actuals.map((p) => (
          <circle key={p.index} cx={x(p.index)} cy={y(p.actual!)} r="3.5" fill={COLORS.actual} />
        ))}
      </svg>
      <figcaption className="flex flex-col gap-2.5 border-hairline pt-1 text-[13px] text-slate lg:border-l lg:pl-5">
        {legend.map(({ key, text }) => (
          <span key={key} className="flex items-center gap-2.5">
            {key === "bar" ? (
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: COLORS.bar, opacity: 0.35 }}
              />
            ) : (
              <span
                aria-hidden
                className="inline-block w-6 border-t-2"
                style={{
                  borderColor: COLORS[key],
                  borderTopStyle: key === "actual" ? "solid" : "dashed",
                }}
              />
            )}
            {text}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
