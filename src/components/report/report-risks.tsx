import { getTranslations } from "next-intl/server";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import type { ReportData } from "@/lib/report-data";

/** The risk overview: the matrix with arrows from the last edition, and the log beside it. */
export async function ReportRisks({
  risks,
  previous,
  newRisks,
}: {
  risks: ReportData["risks"];
  previous: Record<string, [number, number]>;
  newRisks: number[];
}) {
  const t = await getTranslations("report.risks");
  const open = risks.filter((r) => r.status === "open");
  const closed = risks.filter((r) => r.status === "closed");
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[minmax(0,420px)_1fr] items-start gap-8">
        <RiskMatrix
          risks={open.map((r) => ({
            id: r.id,
            number: r.number,
            title: r.title,
            probability: r.probability,
            impact: r.impact,
            previous: previous[r.id]
              ? { probability: previous[r.id]![0], impact: previous[r.id]![1] }
              : null,
          }))}
        />
        <div className="flex flex-col gap-2 text-[13px]">
          <p className="text-[12px] text-slate">{t("arrows")}</p>
          {closed.length > 0 && (
            <p className="text-[12px] text-slate">
              {t("closed", { list: closed.map((r) => r.number).join(", ") })}
            </p>
          )}
        </div>
      </div>
      <table className="w-full border-collapse text-left text-[12px]">
        <thead className="border-b-2 border-hairline text-[10px] font-bold tracking-[0.12em] text-slate uppercase">
          <tr>
            <th scope="col" className="w-10 py-2 pr-3">
              #
            </th>
            <th scope="col" className="py-2 pr-3">
              {t("risk")}
            </th>
            <th scope="col" className="py-2 pr-3">
              {t("consequence")}
            </th>
            <th scope="col" className="py-2 pr-3">
              {t("mitigation")}
            </th>
            <th scope="col" className="py-2">
              {t("change")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline align-top">
          {open.map((r) => (
            <tr key={r.id} className="break-inside-avoid">
              <td className="tabular py-3.5 pr-3 font-bold">{r.number}</td>
              <td className="py-3.5 pr-3">
                {newRisks.includes(r.number) && (
                  <span className="mr-1.5 rounded bg-bronze px-1 py-0.5 text-[9px] font-bold text-paper">
                    {t("new")}
                  </span>
                )}
                {r.title}
                <span className="tabular block text-[10px] text-slate">
                  {t("score", { p: r.probability, i: r.impact })}
                </span>
              </td>
              <td className="py-3.5 pr-3 leading-relaxed whitespace-pre-line">{r.consequence}</td>
              <td className="py-3.5 pr-3 leading-relaxed whitespace-pre-line">{r.mitigation}</td>
              <td className="py-3.5 leading-relaxed whitespace-pre-line">
                {r.changeNote || t("noChange")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
