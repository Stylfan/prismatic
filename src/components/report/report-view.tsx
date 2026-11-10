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
 * The report for the steering group, rendered from one edition's data:
 * the front page with status, figures, the quarter's goals and the cases
 * to decide, then the roadmap, the change control, the forecast, the
 * risks, the decision log and what has been delivered. Each part starts on
 * its own page when printed.
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
  const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
  const next = data.forecast.milestones.find((m) => !m.reached);
  const tiles = [
    {
      label: t("figures.delivered"),
      value: fmt(data.figures.delivered),
      note: t("figures.of", { scope: fmt(data.figures.scope) }),
    },
    {
      label: t("figures.velocity"),
      value: data.figures.avgVelocity === null ? "–" : fmt(data.figures.avgVelocity),
      note: t("figures.perQuarter"),
    },
    {
      label: t("figures.next"),
      value: next ? next.code : "–",
      note: next ? (next.at.avg?.label ?? t("figures.beyond")) : t("figures.allReached"),
    },
    { label: t("figures.risks"), value: fmt(data.figures.openRisks), note: t("figures.open") },
  ];
  const openCases = data.cases.filter((c) => c.status === "open");
  const order = [
    "overview",
    "goals",
    ...(openCases.length > 0 ? ["cases"] : []),
    "roadmap",
    "changes",
    "forecast",
    "risks",
    ...(data.decisions.length > 0 ? ["decisions"] : []),
    ...(data.delivered.length > 0 ? ["delivered"] : []),
  ];
  const num = (key: string) => order.indexOf(key) + 1;

  return (
    <article className="report flex flex-col gap-14">
      <header className="flex flex-col gap-3 border-b border-hairline pb-8">
        <SectionLabel>{t("kicker")}</SectionLabel>
        <h1 className="text-4xl font-bold tracking-[-0.03em]">{data.program.name}</h1>
        <p className="text-sm text-slate">
          {title} ·{" "}
          {new Date(data.generatedAt).toLocaleDateString("da-DK", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <p className="max-w-3xl text-[13px] text-slate italic">{t("disclaimer")}</p>
      </header>

      <ReportSection number={num("overview")} label={t("sections.overview")}>
        <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-1 bg-surface p-4">
              <dt className="text-[10px] font-bold tracking-[0.14em] text-slate uppercase">
                {tile.label}
              </dt>
              <dd className="tabular text-2xl font-semibold">{tile.value}</dd>
              <dd className="text-[11px] text-slate">{tile.note}</dd>
            </div>
          ))}
        </dl>
        {data.statusText ? (
          <p className="max-w-4xl text-[15px] leading-relaxed whitespace-pre-line">
            {data.statusText}
          </p>
        ) : (
          <p className="text-sm text-slate">{t("noStatus")}</p>
        )}
      </ReportSection>

      <ReportSection
        number={num("goals")}
        label={t("sections.goals", { quarter: data.goals.quarter })}
      >
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

      {data.cases.filter((c) => c.status === "open").length > 0 && (
        <ReportSection number={num("cases")} label={t("sections.cases")}>
          <div className="flex flex-col gap-6">
            {data.cases
              .filter((c) => c.status === "open")
              .map((c) => (
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

      <ReportSection number={num("roadmap")} label={t("sections.roadmap")} breakBefore>
        <ReportRoadmap roadmap={data.roadmap} starred={changes.starred} />
      </ReportSection>

      <ReportSection number={num("changes")} label={t("sections.changes")}>
        <ReportChanges text={data.changeText} changes={changes} first={first} />
      </ReportSection>

      <ReportSection number={num("forecast")} label={t("sections.forecast")} breakBefore>
        <ForecastChart view={data.forecast} />
        <MilestoneForecast view={data.forecast} />
      </ReportSection>

      <ReportSection number={num("risks")} label={t("sections.risks")} breakBefore>
        <ReportRisks risks={data.risks} previous={previousRisks} newRisks={changes.newRisks} />
      </ReportSection>

      {data.decisions.length > 0 && (
        <ReportSection number={num("decisions")} label={t("sections.decisions")}>
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
        <ReportSection number={num("delivered")} label={t("sections.delivered")}>
          <div className="grid grid-cols-4 gap-4">
            {data.delivered.map((g) => (
              <div key={g.quarter} className="flex flex-col gap-1.5 break-inside-avoid">
                <p className="text-[13px] font-semibold">{g.quarter}</p>
                {g.items.map((i) => (
                  <p
                    key={i.id}
                    className={cn(
                      "rounded border border-hairline border-l-[3px] p-1.5 text-[11px]",
                      i.track === "technical" ? "border-l-technical" : "border-l-business",
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
  number,
  label,
  children,
  breakBefore,
}: {
  number: number;
  label: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={cn("flex flex-col gap-5", breakBefore && "print:break-before-page")}>
      <SectionLabel number={number}>{label}</SectionLabel>
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
        <ol className="ml-8 flex flex-col gap-2">
          {goal.children.map((c, i) => (
            <GoalLine key={c.id} goal={c} code={`${code}.${i + 1}`} t={t} />
          ))}
        </ol>
      )}
    </li>
  );
}
