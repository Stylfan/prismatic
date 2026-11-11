"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

export type HoverPoint = {
  index: number;
  label: string;
  actual: number | null;
  high: number | null;
  avg: number | null;
  low: number | null;
};

const LINES = [
  { key: "actual", color: "var(--color-ink)" },
  { key: "high", color: "var(--color-tempo-high)" },
  { key: "avg", color: "var(--color-tempo-avg)" },
  { key: "low", color: "var(--color-tempo-low)" },
] as const;

/**
 * Reading help over the forecast chart: wherever the mouse is, a thin line
 * drops to the quarter below it, each line gets a dot where it stands in
 * that quarter, and a small box says which quarter it is, what each line
 * stands at, and which milestones each tempo has reached by then. Purely a
 * help for the eye; the tables below hold the same numbers.
 */
export function ChartHover({
  points,
  maxIndex,
  yMax,
  milestones,
}: {
  points: HoverPoint[];
  maxIndex: number;
  yMax: number;
  milestones: Array<{ code: string; title: string; threshold: number }>;
}) {
  const t = useTranslations("forecast.chart");
  const [index, setIndex] = useState<number | null>(null);
  const fx = (i: number) => (i + 0.5) / (maxIndex + 1);
  const fy = (v: number) => 1 - Math.min(v, yMax) / yMax;
  const pct = (f: number) => `${(f * 100).toFixed(3)}%`;
  const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");

  const point = index === null ? null : points.find((p) => p.index === index);
  const lines = point ? LINES.filter((l) => point[l.key] !== null) : [];
  // The furthest milestone each line has passed in this quarter.
  const passed = (value: number) => milestones.filter((m) => value >= m.threshold).at(-1);
  const flip = point ? fx(point.index) > 0.6 : false;

  return (
    <div
      aria-hidden
      className="absolute inset-0 cursor-crosshair"
      onMouseMove={(e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const f = (e.clientX - box.left) / box.width;
        setIndex(Math.max(0, Math.min(maxIndex, Math.floor(f * (maxIndex + 1)))));
      }}
      onMouseLeave={() => setIndex(null)}
    >
      {point && (
        <>
          <span
            className="pointer-events-none absolute inset-y-0 w-px bg-ink/30"
            style={{ left: pct(fx(point.index)) }}
          />
          {lines.map((l) => (
            <span
              key={l.key}
              className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full ring-2 ring-surface"
              style={{
                left: pct(fx(point.index)),
                top: pct(fy(point[l.key]!)),
                background: l.color,
              }}
            />
          ))}
          <div
            className={cn(
              "pointer-events-none absolute top-3 z-10 w-56 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[12px] shadow-[0_4px_16px_rgba(31,45,51,0.12)]",
              flip ? "-translate-x-[calc(100%+10px)]" : "translate-x-2.5",
            )}
            style={{ left: pct(fx(point.index)) }}
          >
            <p className="mb-1.5 text-[13px] font-semibold text-ink">{point.label}</p>
            <dl className="flex flex-col gap-1">
              {lines.map((l) => {
                const value = point[l.key]!;
                const reached = passed(value);
                return (
                  <div key={l.key} className="flex flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-slate">
                        <span className="size-2 rounded-full" style={{ background: l.color }} />
                        {t(l.key)}
                      </dt>
                      <dd className="font-semibold text-ink tabular">{fmt(value)}</dd>
                    </div>
                    {reached && (
                      <span className="pl-3.5 text-[11px] text-slate">
                        {t("hoverReached", { code: reached.code, title: reached.title })}
                      </span>
                    )}
                  </div>
                );
              })}
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
