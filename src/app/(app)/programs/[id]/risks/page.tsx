import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ProgramTabs } from "@/components/program/program-tabs";
import { AddRiskForm } from "@/components/risks/add-risk-form";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import { RiskRow } from "@/components/risks/risk-row";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { byScore } from "@/domain/risk";
import { getProgram } from "@/services/programs";
import { listRisks } from "@/services/risks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await requireUser();
  const full = getProgram(getDb(), user.id, (await params).id);
  return { title: full?.program.name };
}

/** Risici: the matrix of open risks and the log behind it. */
export default async function RisksPage({ params }: Params) {
  const user = await requireUser();
  const db = getDb();
  const full = getProgram(db, user.id, (await params).id);
  if (!full) notFound();
  const { program } = full;
  const t = await getTranslations("program");
  const tr = await getTranslations("risks");
  const all = listRisks(db, program.id);
  const open = all.filter((r) => r.status === "open");
  const closed = all.filter((r) => r.status === "closed");

  return (
    <div className="flex flex-col gap-12">
      <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
      <ProgramTabs programId={program.id} active="risks" />
      <Section
        id="matrix"
        number={1}
        label={tr("matrix.label")}
        title={tr("matrix.heading")}
        lead={tr("matrix.lead")}
      >
        <div className="grid grid-cols-[minmax(0,480px)_1fr] gap-8">
          <Panel>
            <RiskMatrix risks={open} />
          </Panel>
          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-bold tracking-[0.14em] text-slate uppercase">
              {tr("mostSerious")}
            </p>
            {open.length === 0 ? (
              <p className="text-sm text-slate">{tr("noneOpen")}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {byScore(open)
                  .slice(0, 6)
                  .map((r) => (
                    <li key={r.id} className="flex items-start gap-3 text-sm">
                      <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper">
                        {r.number}
                      </span>
                      {r.title}
                    </li>
                  ))}
              </ol>
            )}
            {closed.length > 0 && (
              <p className="mt-4 text-[12px] text-slate">
                {tr("closedList", { list: closed.map((r) => r.number).join(", ") })}
              </p>
            )}
          </div>
        </div>
      </Section>
      <Section
        id="log"
        number={2}
        label={tr("log.label")}
        title={tr("log.title")}
        lead={tr("log.lead")}
      >
        <Panel>
          <AddRiskForm programId={program.id} />
        </Panel>
        {all.length > 0 && (
          <ul className="divide-y divide-hairline-soft overflow-hidden rounded-lg border border-hairline">
            {all.map((r) => (
              <RiskRow key={r.id} risk={r} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
