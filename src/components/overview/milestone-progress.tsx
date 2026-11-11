import { getTranslations } from "next-intl/server";
import type { MilestoneRow } from "@/lib/forecast-view";
import { TEMPI } from "@/domain/forecast";
import { cn } from "@/lib/cn";

/**
 * Each milestone as a bar of how much of its cumulative scope is delivered,
 * with when it looks likely in each tempo, in the tempo's own colour.
 */
export async function MilestoneProgress({
  milestones,
  delivered,
}: {
  milestones: MilestoneRow[];
  delivered: number;
}) {
  const t = await getTranslations("overview.milestones");
  if (milestones.length === 0) return <p className="text-[13px] text-slate">{t("none")}</p>;
  return (
    <ul className="flex flex-col divide-y divide-hairline-soft">
      {milestones.map((m) => {
        const share = m.threshold > 0 ? Math.min(1, delivered / m.threshold) : 0;
        return (
          <li key={m.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 py-3">
            <span className="row-span-2 text-[13px] font-semibold text-ink tabular">{m.code}</span>
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium text-ink">{m.title}</span>
              <span className="shrink-0 text-[12px] text-slate tabular">
                {Math.round(share * 100)} % ·{" "}
                {t("points", { points: m.threshold.toLocaleString("da-DK") })}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                <div
                  className={cn("h-full rounded-full", m.reached ? "bg-success" : "bg-ink")}
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                {m.reached ? (
                  <span className="font-medium text-success">
                    {t("reached", { when: m.reached })}
                  </span>
                ) : (
                  TEMPI.map((tempo) => (
                    <span key={tempo} className="flex items-center gap-1.5 text-slate">
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 rounded-full",
                          tempo === "low" && "bg-tempo-low",
                          tempo === "avg" && "bg-tempo-avg",
                          tempo === "high" && "bg-tempo-high",
                        )}
                      />
                      <span className="sr-only">{t(`tempo.${tempo}`)}</span>
                      <span className={cn(tempo === "avg" && "font-medium text-ink")}>
                        {m.at[tempo]?.label ?? t("beyond")}
                      </span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
