import { getTranslations } from "next-intl/server";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import type { ReportData } from "@/lib/report-data";

/** Above this many characters the change note folds to its first words on screen. */
const FOLD_AT = 70;

/**
 * The risks: the matrix with arrows from the last edition beside the log,
 * which reads risk, consequence, mitigation and what has changed since
 * last time. A long change note folds to one line on screen and opens with
 * a click; printed, it stands in full.
 */
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
  const open = risks.filter((r) => r.status === "open").sort((a, b) => a.number - b.number);
  const closed = risks.filter((r) => r.status === "closed");
  const cell = "py-3 pr-3 leading-relaxed";
  return (
    <div className="grid grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start gap-8 print:block">
      <div className="flex flex-col gap-2 print:mb-6 print:max-w-sm">
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
        <p className="text-[11px] text-slate">{t("arrows")}</p>
        {closed.length > 0 && (
          <p className="text-[11px] text-slate">
            {t("closed", { list: closed.map((r) => r.number).join(", ") })}
          </p>
        )}
      </div>
      <table className="w-full border-collapse text-left text-[12px]">
        <thead className="border-b-2 border-hairline text-[10px] font-semibold tracking-[0.08em] text-slate uppercase">
          <tr>
            <th scope="col" className="w-8 py-2 pr-3">
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
            <th scope="col" className="w-[24%] py-2">
              {t("change")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline align-top">
          {open.map((r) => {
            const note = r.changeNote || t("noChange");
            return (
              <tr key={r.id} className="break-inside-avoid">
                <td className={`${cell} tabular font-semibold`}>{r.number}</td>
                <td className={cell}>
                  {newRisks.includes(r.number) && (
                    <span className="mr-1.5 rounded bg-bronze px-1 py-0.5 text-[9px] font-bold text-paper">
                      {t("new")}
                    </span>
                  )}
                  <span className="first-letter:uppercase">{r.title}</span>
                </td>
                <td className={`${cell} whitespace-pre-line`}>{r.consequence}</td>
                <td className={`${cell} whitespace-pre-line`}>{r.mitigation}</td>
                <td className="py-3 leading-relaxed">
                  {note.length > FOLD_AT ? (
                    <>
                      <details className="group print:hidden">
                        <summary className="cursor-pointer list-none text-ink [&::-webkit-details-marker]:hidden">
                          <span className="group-open:hidden">
                            {note.slice(0, FOLD_AT).trimEnd()} …
                          </span>
                          <span className="hidden text-[11px] text-slate group-open:inline">
                            {t("fold")}
                          </span>
                        </summary>
                        <p className="mt-1 whitespace-pre-line">{note}</p>
                      </details>
                      <p className="hidden whitespace-pre-line print:block">{note}</p>
                    </>
                  ) : (
                    <span className="whitespace-pre-line">{note}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
