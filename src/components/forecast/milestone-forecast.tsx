import { getTranslations } from "next-intl/server";
import { TEMPI } from "@/domain/forecast";
import type { ForecastView } from "@/lib/forecast-view";

/** When each milestone is reached in each tempo, and what the programme has cost by then. */
export async function MilestoneForecast({ view }: { view: ForecastView }) {
  const t = await getTranslations("forecast.milestones");
  const fmt = (n: number) => n.toLocaleString("da-DK");
  const kr = (n: number | null) => (n === null ? "" : t("cost", { amount: fmt(n) }));
  if (view.milestones.length === 0) return <p className="text-sm text-slate">{t("none")}</p>;
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-hairline bg-paper text-[11px] font-bold tracking-[0.12em] text-slate uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              {t("milestone")}
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              {t("scope")}
            </th>
            {TEMPI.map((tempo) => (
              <th key={tempo} scope="col" className="px-4 py-3">
                {t(tempo)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {view.milestones.map((m) => (
            <tr key={m.id}>
              <th scope="row" className="px-4 py-3 font-semibold">
                {m.code} · {m.title}
              </th>
              <td className="tabular px-4 py-3 text-right">{fmt(m.threshold)}</td>
              {m.reached ? (
                <td colSpan={3} className="px-4 py-3 font-semibold text-success">
                  {t("reached", { quarter: m.reached })}
                </td>
              ) : (
                TEMPI.map((tempo) => {
                  const at = m.at[tempo];
                  return (
                    <td key={tempo} className="px-4 py-3">
                      {at ? (
                        <>
                          <span className={tempo === "avg" ? "font-semibold" : ""}>{at.label}</span>
                          {at.cost !== null && (
                            <span className="tabular block text-[11px] text-slate">
                              {kr(at.cost)}
                            </span>
                          )}
                        </>
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
