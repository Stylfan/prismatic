import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ForecastView } from "@/lib/forecast-view";

// Better than average first, then the average, then below: the same order everywhere.
const ORDER = ["high", "avg", "low"] as const;

/**
 * When the forecast indicates each milestone is reached, in each of the
 * three tempi, with the milestone's guestimate. Under a small arrow, the
 * milestone's own short description from the settings.
 */
export async function MilestoneForecast({ view }: { view: Omit<ForecastView, "rows"> }) {
  const t = await getTranslations("forecast.milestones");
  const fmt = (n: number) => n.toLocaleString("da-DK");
  if (view.milestones.length === 0) return <p className="text-sm text-slate">{t("none")}</p>;
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-hairline bg-paper text-[12px] text-slate">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              {t("milestone")}
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              {t("scope")}
            </th>
            {ORDER.map((tempo) => (
              <th key={tempo} scope="col" className="px-4 py-2.5 font-medium">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ background: `var(--color-tempo-${tempo})` }}
                  />
                  {t(tempo)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {view.milestones.map((m) => (
            <tr key={m.id} className="align-top">
              <th scope="row" className="px-4 py-2.5 font-normal">
                <details className="group">
                  <summary
                    className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-ink [&::-webkit-details-marker]:hidden"
                    aria-label={t("describe", { title: m.title })}
                  >
                    <ChevronRight
                      className="size-3.5 shrink-0 text-slate transition-transform group-open:rotate-90"
                      aria-hidden
                    />
                    {m.code} · {m.title}
                  </summary>
                  <p className="mt-1.5 ml-5 max-w-md text-[13px] leading-relaxed text-slate">
                    {m.description || t("noDescription")}
                  </p>
                </details>
              </th>
              <td className="px-4 py-2.5 text-right tabular">{fmt(m.threshold)}</td>
              {m.reached ? (
                <td colSpan={3} className="px-4 py-2.5 font-semibold text-success">
                  {t("reached", { quarter: m.reached })}
                </td>
              ) : (
                ORDER.map((tempo) => {
                  const at = m.at[tempo];
                  return (
                    <td key={tempo} className="px-4 py-2.5">
                      {at ? (
                        <span className={tempo === "avg" ? "font-semibold" : ""}>{at.label}</span>
                      ) : (
                        <span className="text-slate">{view.result.stats ? t("beyond") : "–"}</span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
