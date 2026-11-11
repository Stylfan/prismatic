import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ForecastView } from "@/lib/forecast-view";
import { ChartHover } from "./chart-hover";
import { chartScale, spreadLabels } from "./chart-scale";

/**
 * The forecast as a picture, built like the steering group's slides: a bar
 * for what was delivered in each ended quarter, a solid line for the total,
 * and the three tempi dashed, because they are calculated, not measured.
 * Each milestone is a thin line that runs into its name on the right.
 *
 * The lines are drawn in an SVG that stretches with the page, while every
 * text, dot and label is laid over it in HTML at a fixed size, so the chart
 * reads the same on a laptop and on a wide screen. The tables below carry
 * the same numbers for anyone who cannot see the chart.
 */

const HEIGHT = 340; // the plot area, in pixels
const LABEL_GAP = 27; // a milestone name is 24 px tall; this keeps a little air between two

const COLORS = {
  actual: "var(--color-ink)",
  bar: "var(--color-slate)",
  high: "var(--color-tempo-high)",
  avg: "var(--color-tempo-avg)",
  low: "var(--color-tempo-low)",
};

const TEMPO_ORDER = ["high", "avg", "low"] as const;

export async function ForecastChart({ view }: { view: Omit<ForecastView, "rows"> }) {
  const t = await getTranslations("forecast.chart");
  const { result, milestones, currentIndex, axisLabels } = view;
  if (!result.stats) return <p className="text-sm text-slate">{t("noData")}</p>;

  const scale = chartScale({ result, milestones, currentIndex });
  const { maxIndex, yMax, ticks } = scale;
  const points = result.series.filter((p) => p.index <= maxIndex);
  // Positions as fractions of the plot: x across, y down from the top.
  const fx = (i: number) => (i + 0.5) / (maxIndex + 1);
  const fy = (v: number) => 1 - Math.min(v, yMax) / yMax;
  const pct = (f: number) => `${(f * 100).toFixed(3)}%`;
  const path = (key: "actual" | "low" | "avg" | "high") =>
    points
      .filter((p) => p[key] !== null)
      .map(
        (p, n) =>
          `${n === 0 ? "M" : "L"}${(fx(p.index) * 1000).toFixed(1)},${((1 - p[key]! / yMax) * 1000).toFixed(1)}`,
      )
      .join(" ");

  // What was delivered in each ended quarter: the step between running totals.
  const actuals = points.filter((p) => p.actual !== null);
  const bars = actuals.map((p, n) => ({
    index: p.index,
    value: p.actual! - (n === 0 ? 0 : actuals[n - 1]!.actual!),
  }));
  const fmt = (n: number) => n.toLocaleString("da-DK");
  const labels = spreadLabels(
    milestones.map((m) => ({ id: m.id, at: fy(m.threshold) * HEIGHT })),
    LABEL_GAP,
    HEIGHT,
  );

  const legend = [
    { key: "bar", text: t("perQuarter") },
    { key: "actual", text: t("actual") },
    ...TEMPO_ORDER.map((tempo) => ({ key: tempo, text: t(tempo) })),
  ] as const;

  return (
    <figure className="flex flex-col gap-3" aria-labelledby="forecast-chart-title">
      <span id="forecast-chart-title" className="sr-only">
        {t("title")}
      </span>
      {/* Never squeezed below what reads: on a narrow window the chart scrolls sideways. */}
      <div className="overflow-x-auto pt-2">
        <div className="grid min-w-[46rem] grid-cols-[3rem_minmax(0,1fr)_13rem]">
          {/* The scale: a figure every step, no lines across. */}
          <div className="relative" style={{ height: HEIGHT }} aria-hidden>
            {ticks.map((v) => (
              <span
                key={v}
                className="absolute right-3 -translate-y-1/2 text-[11px] text-slate tabular"
                style={{ top: pct(fy(v)) }}
              >
                {fmt(v)}
              </span>
            ))}
          </div>

          <div className="relative border-b border-l border-hairline" style={{ height: HEIGHT }}>
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full"
              aria-hidden
            >
              {bars.map((b) => (
                <rect
                  key={b.index}
                  x={fx(b.index) * 1000 - 9}
                  y={fy(b.value) * 1000}
                  width={18}
                  height={(1 - fy(b.value)) * 1000}
                  fill={COLORS.bar}
                  fillOpacity="0.3"
                />
              ))}
              {milestones.map((m) => (
                <line
                  key={m.id}
                  x1="0"
                  x2="1000"
                  y1={fy(m.threshold) * 1000}
                  y2={fy(m.threshold) * 1000}
                  stroke="var(--color-slate)"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {TEMPO_ORDER.map((tempo) => (
                <path
                  key={tempo}
                  d={path(tempo)}
                  fill="none"
                  stroke={COLORS[tempo]}
                  strokeWidth={tempo === "avg" ? 2.25 : 2}
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={path("actual")}
                fill="none"
                stroke={COLORS.actual}
                strokeWidth="2.5"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {actuals.map((p) => (
              <span
                key={p.index}
                aria-hidden
                className="absolute size-2 -translate-1/2 rounded-full bg-ink ring-2 ring-surface"
                style={{ left: pct(fx(p.index)), top: pct(fy(p.actual!)) }}
              />
            ))}
            <ChartHover
              points={points.map((p) => ({
                index: p.index,
                label: axisLabels[p.index] ?? "",
                actual: p.actual,
                // A quarter that has ended has one number: what was delivered.
                high: p.actual === null ? p.high : null,
                avg: p.actual === null ? p.avg : null,
                low: p.actual === null ? p.low : null,
              }))}
              maxIndex={maxIndex}
              yMax={yMax}
              milestones={milestones.map((m) => ({
                code: m.code,
                title: m.title,
                threshold: m.threshold,
              }))}
            />
          </div>

          {/* Each milestone's line runs on into its name, nudged apart where they would touch. */}
          <div className="relative" style={{ height: HEIGHT }}>
            <svg className="absolute inset-y-0 left-0 h-full w-6 overflow-visible" aria-hidden>
              {milestones.map((m) => {
                const from = fy(m.threshold) * HEIGHT;
                const to = labels.get(m.id) ?? from;
                return (
                  <path
                    key={m.id}
                    d={`M0,${from} C12,${from} 12,${to} 24,${to}`}
                    fill="none"
                    stroke="var(--color-slate)"
                    strokeOpacity="0.45"
                  />
                );
              })}
            </svg>
            {milestones.map((m) => (
              <span
                key={m.id}
                className="absolute left-6 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-hairline bg-surface py-0.5 pr-2.5 pl-1 text-[12px] whitespace-nowrap text-ink"
                style={{ top: labels.get(m.id) ?? 0 }}
              >
                <span className="rounded-full bg-ink px-1.5 text-[10px] leading-4 font-semibold text-paper tabular">
                  {m.code}
                </span>
                {m.title}
              </span>
            ))}
          </div>

          {/* Every quarter, written out, the season over the year. */}
          <div />
          <div className="relative h-9" aria-hidden>
            {Array.from({ length: maxIndex + 1 }, (_, i) => i).map((i) => {
              const label = axisLabels[i] ?? "";
              const cut = label.indexOf(" ");
              return (
                <span
                  key={i}
                  className="absolute top-1.5 -translate-x-1/2 text-center text-[10px] leading-tight text-slate"
                  style={{ left: pct(fx(i)) }}
                >
                  {cut < 0 ? label : label.slice(0, cut)}
                  <br />
                  {cut < 0 ? "" : label.slice(cut + 1)}
                </span>
              );
            })}
          </div>
          <div />
        </div>
      </div>

      <details className="group ml-12 text-[12px] text-slate">
        <summary className="flex w-max cursor-pointer list-none items-center gap-1 hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="size-3.5 transition-transform group-open:rotate-90"
            aria-hidden
          />
          {t("legend")}
        </summary>
        <figcaption className="mt-2 flex flex-wrap gap-x-6 gap-y-2 pl-4.5">
          {legend.map(({ key, text }) => (
            <span key={key} className="flex items-center gap-2">
              {key === "bar" ? (
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-sm"
                  style={{ background: COLORS.bar, opacity: 0.35 }}
                />
              ) : (
                <span
                  aria-hidden
                  className="inline-block w-5 border-t-2"
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
      </details>
    </figure>
  );
}
