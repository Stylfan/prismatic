import { getTranslations } from "next-intl/server";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { MilestoneForecast } from "@/components/forecast/milestone-forecast";
import { SectionLabel } from "@/components/ui/layout";
import type { ChangeControl } from "@/domain/report";
import { cn } from "@/lib/cn";
import type { GoalNode, ReportData } from "@/lib/report-data";
import { ReportCases } from "./report-cases";
import { ReportChanges } from "./report-changes";
import { ReportDecisions } from "./report-decisions";
import { ReportRisks } from "./report-risks";
import { ReportRoadmap } from "./report-roadmap";

/**
 * The quarter's report for the steering group, rendered from one
 * edition's data: the short update beside the quarter's goals, then the
 * forecast, the roadmap, the changes since last time, the milestones, the
 * risks, the cases to decide, the decision log and what has been
 * delivered. The larger parts start on a page of their own when printed.
 */
export async function ReportView({
  data,
  changes,
  previousRisks,
  title,
  first,
}: {
  data: ReportData;
  changes: ChangeControl;
  previousRisks: Record<string, [number, number]>;
  title: string;
  first: boolean;
}) {
  const t = await getTranslations("report");
  const openCases = data.cases.filter((c) => c.status === "open");

  return (
    <article className="report flex flex-col gap-14">
      <header className="flex flex-col gap-3 border-b border-hairline pb-8">
        <h1 className="text-4xl font-bold tracking-[-0.03em]">{data.program.name}</h1>
        <p className="text-sm text-slate">
          {title} ·{" "}
          {new Date(data.generatedAt).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="max-w-3xl text-[13px] whitespace-pre-line text-slate italic">
          {t("disclaimer")}
        </p>
      </header>

      <div className="grid grid-cols-2 items-start gap-10">
        <ReportSection label={t("sections.update")}>
          {data.statusText ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-line">{data.statusText}</p>
          ) : (
            <p className="text-sm text-slate">{t("noStatus")}</p>
          )}
        </ReportSection>
        <ReportSection label={t("sections.goals", { quarter: data.goals.quarter })}>
          {data.goals.list.length === 0 ? (
            <p className="text-sm text-slate">{t("noGoals")}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {data.goals.list.map((g, i) => (
                <GoalLine key={g.id} goal={g} code={`${i + 1}`} t={t} />
              ))}
            </ol>
          )}
        </ReportSection>
      </div>

      <ReportSection label={t("sections.forecast")} breakBefore>
        <ForecastChart view={data.forecast} />
      </ReportSection>

      <ReportSection label={t("sections.roadmap")} breakBefore>
        <ReportRoadmap roadmap={data.roadmap} starred={changes.starred} />
      </ReportSection>

      <ReportSection label={t("sections.changes")}>
        <ReportChanges text={data.changeText} changes={changes} first={first} />
      </ReportSection>

      <ReportSection label={t("sections.milestones")} breakBefore>
        <MilestoneForecast view={data.forecast} />
      </ReportSection>

      <ReportSection label={t("sections.risks")} breakBefore>
        <ReportRisks risks={data.risks} previous={previousRisks} newRisks={changes.newRisks} />
      </ReportSection>

      {openCases.length > 0 && (
        <ReportSection label={t("sections.cases")}>
          <ReportCases cases={openCases} />
        </ReportSection>
      )}

      {data.decisions.length > 0 && (
        <ReportSection label={t("sections.decisions")}>
          <ReportDecisions decisions={data.decisions} />
        </ReportSection>
      )}

      {data.delivered.length > 0 && (
        <ReportSection label={t("sections.delivered")}>
          <div className="grid grid-cols-4 gap-3">
            {data.delivered.map((g) => (
              <div
                key={g.quarter}
                className="flex flex-col gap-1.5 rounded-lg bg-sand/70 p-2.5 break-inside-avoid"
              >
                <p className="flex items-baseline justify-between gap-2 text-[12px] font-semibold">
                  {g.quarter}
                  <span className="text-[11px] font-normal text-slate tabular">
                    {t("pointsShort", {
                      points: g.items
                        .reduce((n, i) => n + (i.points ?? 0), 0)
                        .toLocaleString("da-DK"),
                    })}
                  </span>
                </p>
                {g.items.map((i) => (
                  <p
                    key={i.id}
                    className={cn(
                      "rounded-md border border-hairline border-l-[3px] bg-surface px-2 py-1.5 text-[11px] leading-snug",
                      i.kind === "goal" ? "border-l-goal" : "border-l-feature",
                    )}
                  >
                    {i.title}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </ReportSection>
      )}
    </article>
  );
}

function ReportSection({
  label,
  children,
  breakBefore,
}: {
  label: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={cn("flex flex-col gap-4", breakBefore && "print:break-before-page")}>
      <div className="flex flex-col gap-2">
        <SectionLabel>{label}</SectionLabel>
        <div className="border-t-[1.5px] border-ink" />
      </div>
      {children}
    </section>
  );
}

const STATUS_CLASS = {
  achieved: "bg-success/12 text-success",
  partial: "bg-warning/15 text-warning",
  missed: "bg-danger/12 text-danger",
  open: "border border-hairline text-slate",
};

function GoalLine({
  goal,
  code,
  t,
}: {
  goal: GoalNode;
  code: string;
  t: Awaited<ReturnType<typeof getTranslations<"report">>>;
}) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span className="tabular w-8 shrink-0 text-[13px] font-bold text-bronze-deep">{code}</span>
        <p className="flex-1 text-[14px] leading-snug">
          {goal.stretch && (
            <span className="mr-2 rounded bg-sand px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-bronze-deep uppercase">
              {t("stretch")}
            </span>
          )}
          {goal.title}
        </p>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            STATUS_CLASS[goal.status],
          )}
        >
          {t(`goalStatus.${goal.status}`)}
        </span>
      </div>
      {goal.children.length > 0 && (
        <ol className="flex flex-col gap-2">
          {goal.children.map((c, i) => (
            <GoalLine key={c.id} goal={c} code={`${code}.${i + 1}`} t={t} />
          ))}
        </ol>
      )}
    </li>
  );
}
