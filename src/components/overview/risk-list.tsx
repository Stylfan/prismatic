import { getTranslations } from "next-intl/server";
import type { Risk } from "@/db/schema";
import { riskBand, riskScore } from "@/domain/risk";
import { cn } from "@/lib/cn";

/**
 * Risks in number order beside the matrix, so a number can be read as a
 * risk. Closed ones are struck through, as in the log.
 */
export async function RiskList({ risks, closed = false }: { risks: Risk[]; closed?: boolean }) {
  const t = await getTranslations("overview");
  if (risks.length === 0) return <p className="text-[13px] text-slate">{t("noRisks")}</p>;
  return (
    <ol className="flex flex-col divide-y divide-hairline-soft">
      {[...risks]
        .sort((a, b) => a.number - b.number)
        .map((r) => {
          const band = riskBand(r.probability, r.impact);
          return (
            <li key={r.id} className="flex items-start gap-3 py-1.5 text-[13px]">
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper tabular">
                {r.number}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 leading-snug first-letter:uppercase",
                  closed && "text-slate line-through",
                )}
              >
                {r.title}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-px text-[11px] font-semibold tabular",
                  closed && "bg-sand text-slate",
                  !closed && band === "high" && "bg-danger-soft text-danger",
                  !closed && band === "medium" && "bg-warning-soft text-warning",
                  !closed && band === "low" && "bg-success-soft text-success",
                )}
              >
                {riskScore(r.probability, r.impact)}
              </span>
            </li>
          );
        })}
    </ol>
  );
}
