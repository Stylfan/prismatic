import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ForecastView } from "@/lib/forecast-view";

// Better than average first, then the average, then below: the same order everywhere.
const ORDER = ["high", "avg", "low"] as const;

/**
 * When the forecast indicates each milestone is reached, in each of the
 * three tempi, with the milestone's guestimate. A click on the row opens
 * the milestone's own short description from the settings, the full width
 * of the list.
 */
export async function MilestoneForecast({ view }: { view: Omit<ForecastView, "rows"> }) {
  const t = await getTranslations("forecast.milestones");
  const fmt = (n: number) => n.toLocaleString("da-DK");
  if (view.milestones.length === 0) return <p className="text-sm text-slate">{t("none")}</p>;
  // One grid for the header and every row, so the columns line up without a table,
  // and the opened description can run the full width underneath.
  const cols = "grid grid-cols-[minmax(13rem,16rem)_7rem_repeat(3,minmax(0,1fr))] items-center";
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface text-[13px]">
      <div
        className={`${cols} border-b border-hairline bg-paper text-[12px] font-medium text-slate`}
      >
        <span className="px-4 py-2.5">{t("milestone")}</span>
        <span className="px-4 py-2.5 text-right">{t("scope")}</span>
        {ORDER.map((tempo) => (
          <span key={tempo} className="flex items-center gap-2 px-4 py-2.5">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: `var(--color-tempo-${tempo})` }}
            />
            {t(tempo)}
          </span>
        ))}
      </div>
      <div className="divide-y divide-hairline-soft">
        {view.milestones.map((m) => (
          <details key={m.id} className="group">
            <summary
              className={`${cols} cursor-pointer list-none hover:bg-paper/60 [&::-webkit-details-marker]:hidden`}
            >
              <span className="flex items-center gap-1.5 px-4 py-2.5 font-semibold text-ink">
                <ChevronRight
                  className="size-3.5 shrink-0 text-slate transition-transform group-open:rotate-90"
                  aria-hidden
                />
                {m.code}: {m.title}
              </span>
              <span className="px-4 py-2.5 text-right tabular">{fmt(m.threshold)}</span>
              {m.reached ? (
                <span className="col-span-3 px-4 py-2.5 font-semibold text-success">
                  {t("reached", { quarter: m.reached })}
                </span>
              ) : (
                ORDER.map((tempo) => {
                  const at = m.at[tempo];
                  return (
                    <span key={tempo} className="px-4 py-2.5">
                      {at ? (
                        <span className={tempo === "avg" ? "font-semibold" : ""}>{at.label}</span>
                      ) : (
                        <span className="text-slate">{view.result.stats ? t("beyond") : "–"}</span>
                      )}
                    </span>
                  );
                })
              )}
            </summary>
            <p className="px-4 pb-3 pl-9 text-[13px] leading-relaxed text-slate">
              {m.description || t("noDescription")}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
