import { Flag, Plug, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import type { ReportData } from "@/lib/report-data";

/**
 * The roadmap as the report shows it: the same columns as the board, the
 * open cards in them, milestones at the foot of their column, and a star on
 * every card that is new, moved or re-estimated since the last edition.
 */
export async function ReportRoadmap({
  roadmap,
  starred,
}: {
  roadmap: ReportData["roadmap"];
  starred: string[];
}) {
  const t = await getTranslations("roadmap");
  const tb = await getTranslations("backlog");
  const tr = await getTranslations("report");
  const stars = new Set(starred);
  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline"
        style={{ gridTemplateColumns: `repeat(${roadmap.columns.length}, minmax(0, 1fr))` }}
      >
        {roadmap.columns.map((col, i) => (
          <section
            key={col.key}
            aria-label={col.label}
            className={cn(
              "flex flex-col gap-2 p-2.5",
              col.kind === "unplanned" ? "bg-paper" : "bg-surface",
            )}
          >
            <header className="border-b border-hairline-soft pb-1.5">
              <h4 className="text-[12px] leading-snug font-semibold">{col.label}</h4>
              <p className="tabular text-[10px] text-slate">
                {col.pct === null
                  ? t("planned", { points: col.load.toLocaleString("da-DK") })
                  : t("plannedPct", { points: col.load.toLocaleString("da-DK"), pct: col.pct })}
              </p>
            </header>
            {col.events.map((e) => (
              <p key={e.id} className="rounded bg-sand px-1.5 py-0.5 text-[10px]">
                {e.title}
              </p>
            ))}
            <ul className="flex flex-col gap-1.5">
              {roadmap.cards
                .filter((c) => c.column === i)
                .map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "relative rounded border border-hairline border-l-[3px] p-1.5 break-inside-avoid",
                      c.track === "technical" ? "border-l-technical" : "border-l-business",
                    )}
                  >
                    {stars.has(c.id) && (
                      <Star
                        className="absolute -top-1.5 -left-2 size-3.5 fill-bronze text-bronze"
                        aria-label={tr("changedSinceLast")}
                      />
                    )}
                    <p className="flex items-center justify-between text-[9px] text-slate">
                      <span className="font-bold">
                        {c.kind === "goal" ? tb("kind.goal") : tb("kind.feature")}
                      </span>
                      <span className="tabular">
                        {c.size} {c.milestoneCode && `· ${c.milestoneCode}`}
                      </span>
                    </p>
                    <p className="text-[11px] leading-snug font-medium">
                      {c.title}
                      {c.integration && (
                        <Plug
                          className="ml-1 inline size-3 text-slate"
                          aria-label={tb("row.integration")}
                        />
                      )}
                    </p>
                  </li>
                ))}
            </ul>
            {roadmap.milestones
              .filter((m) => m.column === i)
              .map((m) => (
                <p
                  key={m.id}
                  className="mt-auto flex items-start gap-1 rounded border border-ink/70 bg-paper p-1.5 text-[10px] font-semibold"
                >
                  <Flag className="mt-0.5 size-3 shrink-0" aria-hidden />
                  {m.code} · {m.title}
                </p>
              ))}
          </section>
        ))}
      </div>
      <p className="flex items-center gap-4 text-[11px] text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-business" aria-hidden />
          {t("legendBusiness")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-technical" aria-hidden />
          {t("legendTechnical")}
        </span>
        <span className="flex items-center gap-1.5">
          <Star className="size-3 fill-bronze text-bronze" aria-hidden />
          {tr("changedSinceLast")}
        </span>
      </p>
    </div>
  );
}
