import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import type { ReportData } from "@/lib/report-data";

const EFFECT = {
  simplifying: "bg-success-soft text-success",
  complicating: "bg-warning-soft text-warning",
  neutral: "border border-hairline text-slate",
  pending: "border border-hairline text-slate",
} as const;

/** The decision log as a table: what, when, where, the decision and whether it simplifies or complicates. */
export async function ReportDecisions({ decisions }: { decisions: ReportData["decisions"] }) {
  const t = await getTranslations("report");
  const cell = "py-3 pr-3 leading-relaxed";
  return (
    <table className="w-full border-collapse text-left text-[12px]">
      <thead className="border-b-2 border-hairline text-[10px] font-semibold tracking-[0.08em] text-slate uppercase">
        <tr>
          <th scope="col" className="py-2 pr-3">
            {t("decision.title")}
          </th>
          <th scope="col" className="py-2 pr-3">
            {t("decision.when")}
          </th>
          <th scope="col" className="py-2 pr-3">
            {t("decision.forum")}
          </th>
          <th scope="col" className="py-2 pr-3">
            {t("decision.decision")}
          </th>
          <th scope="col" className="py-2">
            {t("decision.effect")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline align-top">
        {decisions.map((d) => (
          <tr key={d.id} className="break-inside-avoid">
            <td className={`${cell} font-semibold`}>{d.title}</td>
            <td className={cell}>{d.decidedOn}</td>
            <td className={cell}>{d.forum}</td>
            <td className={`${cell} whitespace-pre-line`}>{d.decision}</td>
            <td className="py-3">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
                  EFFECT[d.effect],
                )}
              >
                {t(`effects.${d.effect}`)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
