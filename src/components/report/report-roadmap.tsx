import { CalendarDays, Plug, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import type { ReportData } from "@/lib/report-data";

type Roadmap = ReportData["roadmap"];

/**
 * The roadmap as the report shows it, drawn like the roadmap tab: the near
 * quarters in one row and the far half-years in the next, each with how
 * much of its capacity is planned. Cards say what they are and which
 * milestone they belong to, without estimates; activities and milestones
 * stand at the foot of their column; a star marks every card that is new,
 * moved or re-estimated since the last edition.
 */
export async function ReportRoadmap({ roadmap, starred }: { roadmap: Roadmap; starred: string[] }) {
  const t = await getTranslations("roadmap");
  const tr = await getTranslations("report");
  const tb = await getTranslations("backlog");
  const stars = new Set(starred);
  const bands = (["near", "far"] as const)
    .map((band) => ({
      band,
      columns: roadmap.columns.map((col, i) => ({ col, i })).filter(({ col }) => col.kind === band),
    }))
    .filter((b) => b.columns.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {bands.map(({ band, columns }) => (
        <div key={band} className="flex flex-col gap-2 break-inside-avoid">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] text-slate uppercase">
            {t(`band.${band}`)}
          </h3>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${band === "near" ? columns.length : 4}, minmax(0, 1fr))`,
            }}
          >
            {columns.map(({ col, i }) => {
              const cards = roadmap.cards.filter((c) => c.column === i);
              const milestones = roadmap.milestones.filter((m) => m.column === i);
              const over = (col.pct ?? 0) > 100;
              return (
                <section
                  key={col.key}
                  aria-label={col.label}
                  className="flex min-h-40 flex-col gap-2 rounded-lg bg-sand/70 p-2.5"
                >
                  <header className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <h4 className="text-[12px] leading-snug font-semibold">{col.label}</h4>
                    {col.pct !== null && col.pct !== undefined && (
                      <span
                        title={tr("plannedShare")}
                        className={cn(
                          "tabular text-[11px]",
                          over ? "font-semibold text-danger" : "text-slate",
                        )}
                      >
                        {col.pct} %
                      </span>
                    )}
                  </header>
                  <ul className="flex flex-col gap-1.5">
                    {cards.map((c) => (
                      <li
                        key={c.id}
                        className={cn(
                          "relative rounded-md border border-hairline border-l-[3px] bg-surface px-2 py-1.5 break-inside-avoid",
                          c.kind === "goal" ? "border-l-goal" : "border-l-feature",
                        )}
                      >
                        {stars.has(c.id) && (
                          <Star
                            className="absolute -top-1.5 -left-2 size-3.5 fill-bronze text-bronze"
                            aria-label={tr("changedSinceLast")}
                          />
                        )}
                        <p className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "rounded px-1 py-px text-[9px] font-semibold tracking-[0.04em]",
                              c.kind === "goal"
                                ? "bg-goal-soft text-goal"
                                : "bg-feature-soft text-feature",
                            )}
                          >
                            {c.kind === "goal" ? tb("kind.goal") : tb("kind.feature")}
                          </span>
                          {c.milestoneCode && (
                            <span className="tabular text-[10px] text-slate">
                              {c.milestoneCode}
                            </span>
                          )}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[11px] leading-snug",
                            c.kind === "goal" ? "font-semibold" : "font-medium",
                          )}
                        >
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
                  {(col.events.length > 0 || milestones.length > 0) && (
                    <ul className="mt-auto flex flex-col gap-1 pt-1">
                      {col.events.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-1.5 py-1"
                        >
                          <span className="flex h-3.5 shrink-0 items-center rounded-full bg-ink px-1 text-paper">
                            <CalendarDays className="size-2.5" aria-label={t("eventMark")} />
                          </span>
                          <span className="text-[10px] leading-snug font-medium">
                            {col.kind === "far" && (
                              <span className="font-normal text-slate">{e.quarter} · </span>
                            )}
                            {e.title}
                          </span>
                        </li>
                      ))}
                      {milestones.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-1.5 py-1"
                        >
                          <span className="shrink-0 rounded-full bg-ink px-1.5 text-[9px] leading-3.5 font-semibold text-paper tabular">
                            {m.code}
                          </span>
                          <span className="text-[10px] leading-snug font-medium">{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ))}
      <p className="flex items-center gap-4 text-[11px] text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-goal" aria-hidden />
          {t("legendGoal")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-feature" aria-hidden />
          {t("legendFeature")}
        </span>
        <span className="flex items-center gap-1.5">
          <Star className="size-3 fill-bronze text-bronze" aria-hidden />
          {tr("changedSinceLast")}
        </span>
        <span>{tr("plannedShare")}</span>
      </p>
    </div>
  );
}
