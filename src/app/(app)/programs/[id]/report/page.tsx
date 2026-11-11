import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ProgramTabs } from "@/components/program/program-tabs";
import { formatPeriodLabel } from "@/components/program/period-label";
import { CasesEditor, DecisionsEditor } from "@/components/report/cases-editor";
import { DraftEditor, GoalsEditor } from "@/components/report/goals-editor";
import { PublishForm } from "@/components/report/publish-form";
import { buttonClass } from "@/components/ui/controls";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { quarterIndexOf, quarterLabel, type PeriodSettings } from "@/domain/periods";
import { todayInCopenhagen } from "@/lib/dates";
import { getProgram } from "@/services/programs";
import {
  getDraft,
  listCases,
  listDecisions,
  listEditions,
  listGoals,
} from "@/services/report-content";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** Rapport: what the report says in words, the goals and cases, and its published editions. */
export default async function ReportPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program } = full;
      const t = await getTranslations("program");
      const tr = await getTranslations("report");
      const tp = await getTranslations("periods");

      const settings: PeriodSettings = { model: program.periodModel, startDate: program.startDate };
      const today = todayInCopenhagen();
      const current = Math.max(0, quarterIndexOf(settings, today));
      const draft = await getDraft(db, program.id);
      const goalsQuarter = draft.goalsQuarter ?? Math.max(0, current - 1);
      const quarters = Array.from({ length: current + 2 }, (_, i) => ({
        value: String(i),
        label: formatPeriodLabel(tp, quarterLabel(settings, i)),
      })).reverse();
      const editions = await listEditions(db, program.id);
      const [y, m, d] = today.split("-");

      return (
        <div className="flex flex-col gap-12">
          <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
          <ProgramTabs programId={program.id} active="report" />
          <Section
            id="publish"
            number={1}
            label={tr("publish.sectionLabel")}
            title={tr("publish.title")}
            lead={tr("publish.lead")}
          >
            <Panel className="flex flex-col gap-5">
              <div>
                <Link
                  href={`/programs/${program.id}/report/preview`}
                  className={buttonClass("secondary", "sm")}
                >
                  {tr("publish.preview")}
                </Link>
              </div>
              <PublishForm
                programId={program.id}
                defaultTitle={tr("publish.defaultTitle", { date: `${d}.${m}.${y}` })}
              />
              {editions.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-hairline-soft pt-4">
                  <p className="text-[12px] font-bold tracking-[0.12em] text-slate uppercase">
                    {tr("publish.editions")}
                  </p>
                  <ul className="flex flex-col gap-1 text-[13px]">
                    {editions.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/programs/${program.id}/report/${e.id}`}
                          className="underline underline-offset-4 hover:text-ink"
                        >
                          {e.title}
                        </Link>
                        <span className="ml-2 text-slate">
                          {new Date(e.publishedAt).toLocaleString("da-DK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </Section>
          <Section
            id="texts"
            number={2}
            label={tr("editor.label")}
            title={tr("editor.title")}
            lead={tr("editor.lead")}
          >
            <Panel>
              <DraftEditor
                programId={program.id}
                draft={draft}
                quarters={quarters}
                goalsQuarter={goalsQuarter}
              />
            </Panel>
          </Section>
          <Section
            id="goals"
            number={3}
            label={tr("goals.label")}
            title={tr("goals.title")}
            lead={tr("goals.lead")}
          >
            <Panel>
              <GoalsEditor
                programId={program.id}
                quarterIndex={goalsQuarter}
                quarterLabel={formatPeriodLabel(tp, quarterLabel(settings, goalsQuarter))}
                goals={(await listGoals(db, program.id)).filter(
                  (g) => g.quarterIndex === goalsQuarter,
                )}
              />
            </Panel>
          </Section>
          <Section
            id="cases"
            number={4}
            label={tr("cases.label")}
            title={tr("cases.heading")}
            lead={tr("cases.lead")}
          >
            <CasesEditor programId={program.id} cases={await listCases(db, program.id)} />
          </Section>
          <Section
            id="decisions"
            number={5}
            label={tr("decisions.label")}
            title={tr("decisions.heading")}
            lead={tr("decisions.lead")}
          >
            <DecisionsEditor
              programId={program.id}
              decisions={await listDecisions(db, program.id)}
            />
          </Section>
        </div>
      );
    },
    getDb(),
  );
}
