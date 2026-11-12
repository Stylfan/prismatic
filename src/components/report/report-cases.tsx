import { getTranslations } from "next-intl/server";
import type { ReportData } from "@/lib/report-data";

/**
 * The cases the steering group is asked to decide, one to a card: a dark
 * band with the question, the case itself on the left (problem,
 * background, key points), and on the right, set apart, what the steering
 * group is asked to do.
 */
export async function ReportCases({ cases }: { cases: ReportData["cases"] }) {
  const t = await getTranslations("report");
  return (
    <div className="flex flex-col gap-6">
      {cases.map((c) => (
        <article
          key={c.id}
          className="overflow-hidden rounded-lg border border-hairline bg-surface break-inside-avoid"
        >
          <header className="flex items-baseline justify-between gap-4 bg-ink px-5 py-3 text-paper">
            <h3 className="text-[16px] font-semibold">{c.title}</h3>
            <span className="shrink-0 text-[11px] tracking-[0.08em] text-paper/70 uppercase">
              {t("caseBand")}
            </span>
          </header>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 p-5">
            <div className="flex flex-col gap-4">
              {(["problem", "background", "keyPoints"] as const).map((key) => (
                <div key={key}>
                  <p className="text-[10px] font-semibold tracking-[0.1em] text-slate uppercase">
                    {t(`case.${key}`)}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line">
                    {c[key] || "–"}
                  </p>
                </div>
              ))}
            </div>
            <aside className="self-start border-l-[3px] border-technical bg-technical-soft px-4 py-3 text-technical">
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase">{t("caseAsk")}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-ink">
                {c.nextSteps || "–"}
              </p>
            </aside>
          </div>
        </article>
      ))}
    </div>
  );
}
