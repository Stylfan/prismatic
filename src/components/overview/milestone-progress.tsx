import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { MilestoneRow } from "@/lib/forecast-view";
import { cn } from "@/lib/cn";

export type MilestoneProgressRow = MilestoneRow & {
  /** The milestone's own points: its own goals, not the milestones before it. */
  own: number;
  /** What is done of those points. */
  done: number;
};

const DOT = { low: "bg-tempo-low", avg: "bg-tempo-avg", high: "bg-tempo-high" } as const;

/**
 * Each milestone with a bar of how much of its own work is done. Its
 * forecast is folded away under a small arrow, as it is a guess: when
 * opened, the tempo better than average first, the average in the middle,
 * and the tempo below average last, each named and in its colour.
 */
export async function MilestoneProgress({ milestones }: { milestones: MilestoneProgressRow[] }) {
  const t = await getTranslations("overview.milestones");
  if (milestones.length === 0) return <p className="text-[13px] text-slate">{t("none")}</p>;
  const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
  return (
    <ul className="flex flex-col divide-y divide-hairline-soft">
      {milestones.map((m) => {
        const share = m.own > 0 ? Math.min(1, m.done / m.own) : 0;
        return (
          <li key={m.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 py-3">
            <span className="row-span-2 text-[13px] font-semibold text-ink tabular">{m.code}</span>
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-ink">{m.title}</span>
              <span className="shrink-0 text-[12px] text-slate tabular">
                {Math.round(share * 100)} % ·{" "}
                {t("points", { done: fmt(m.done), points: fmt(m.own) })}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                <div
                  className={cn("h-full rounded-full", m.reached ? "bg-success" : "bg-ink")}
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              {m.reached ? (
                <span className="text-[12px] font-medium text-success">
                  {t("reached", { when: m.reached })}
                </span>
              ) : (
                // Folded by default: a forecast is a guess, shown when asked for.
                <details className="group text-[12px] text-slate">
                  <summary className="flex w-max cursor-pointer list-none items-center gap-1 rounded hover:text-ink [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      className="size-3.5 transition-transform group-open:rotate-90"
                      aria-hidden
                    />
                    {t("forecast")}
                  </summary>
                  <dl className="mt-1.5 ml-4.5 grid w-max grid-cols-[auto_auto] gap-x-4 gap-y-1">
                    {(["high", "avg", "low"] as const).map((tempo) => (
                      <div key={tempo} className="contents">
                        <dt className="flex items-center gap-1.5">
                          <span aria-hidden className={cn("size-2 rounded-full", DOT[tempo])} />
                          {t(`tempo.${tempo}`)}
                        </dt>
                        <dd className={cn("tabular", tempo === "avg" && "font-medium text-ink")}>
                          {m.at[tempo]?.label ?? t("beyond")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
