import { getTranslations } from "next-intl/server";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { MilestoneForecast } from "@/components/forecast/milestone-forecast";
import { SectionLabel } from "@/components/ui/layout";
import type { ChangeControl } from "@/domain/report";
import { cn } from "@/lib/cn";
import type { GoalNode, ReportData } from "@/lib/report-data";
import { ReportChanges } from "./report-changes";
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
          <div className="flex flex-col gap-6">
            {openCases.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-hairline bg-surface p-6 break-inside-avoid"
              >
                <h3 className="col-span-2 text-lg font-semibold">{c.title}</h3>
                {(
                  [
                    ["problem", c.problem],
                    ["background", c.background],
                    ["keyPoints", c.keyPoints],
                    ["nextSteps", c.nextSteps],
                  ] as const
                ).map(([key, text]) => (
                  <div key={key}>
                    <p className="text-[11px] font-bold tracking-[0.12em] text-bronze-deep uppercase">
                      {t(`case.${key}`)}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line">
                      {text || "–"}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {data.decisions.length > 0 && (
        <ReportSection label={t("sections.decisions")}>
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-hairline text-[10px] font-bold tracking-[0.12em] text-slate uppercase">
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
            <tbody className="divide-y divide-hairline-soft align-top">
              {data.decisions.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 pr-3 font-semibold">{d.title}</td>
                  <td className="py-2 pr-3">{d.decidedOn}</td>
                  <td className="py-2 pr-3">{d.forum}</td>
                  <td className="py-2 pr-3 whitespace-pre-line">{d.decision}</td>
                  <td className="py-2">{t(`effects.${d.effect}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>
      )}

      {data.delivered.length > 0 && (
        <ReportSection label={t("sections.delivered")}>
          <div className="grid grid-cols-4 gap-4">
            {data.delivered.map((g) => (
              <div key={g.quarter} className="flex flex-col gap-1.5 break-inside-avoid">
                <p className="text-[13px] font-semibold">{g.quarter}</p>
                {g.items.map((i) => (
                  <p
                    key={i.id}
                    className={cn(
                      "rounded border border-hairline border-l-[3px] p-1.5 text-[11px]",
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
    <section className={cn("flex flex-col gap-5", breakBefore && "print:break-before-page")}>
      <SectionLabel>{label}</SectionLabel>
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
