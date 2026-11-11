import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { AddRiskForm } from "@/components/risks/add-risk-form";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import { RiskRow } from "@/components/risks/risk-row";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { byScore, riskBand, riskScore } from "@/domain/risk";
import { cn } from "@/lib/cn";
import { getProgram } from "@/services/programs";
import { listRisks } from "@/services/risks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** Risici: the matrix of open risks and the log behind it. */
export default async function RisksPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program } = full;
      const tr = await getTranslations("risks");
      const all = await listRisks(db, program.id);
      const open = all.filter((r) => r.status === "open");
      const closed = all.filter((r) => r.status === "closed");

      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            label={program.name}
            title={(await getTranslations("nav"))("risks")}
            lead={tr("matrix.lead")}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
            <Panel>
              <RiskMatrix risks={open} />
            </Panel>
            <Panel className="flex flex-col gap-3">
              <h2 className="text-[14px] font-semibold text-ink">{tr("mostSerious")}</h2>
              {open.length === 0 ? (
                <p className="text-sm text-slate">{tr("noneOpen")}</p>
              ) : (
                <ol className="flex flex-col divide-y divide-hairline-soft">
                  {byScore(open)
                    .slice(0, 8)
                    .map((r) => {
                      const band = riskBand(r.probability, r.impact);
                      return (
                        <li key={r.id} className="flex items-center gap-3 py-2 text-[13px]">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper tabular">
                            {r.number}
                          </span>
                          <span className="min-w-0 flex-1">{r.title}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[12px] font-semibold tabular",
                              band === "high" && "bg-danger-soft text-danger",
                              band === "medium" && "bg-warning-soft text-warning",
                              band === "low" && "bg-success-soft text-success",
                            )}
                          >
                            {riskScore(r.probability, r.impact)}
                          </span>
                        </li>
                      );
                    })}
                </ol>
              )}
              {closed.length > 0 && (
                <p className="mt-auto text-[12px] text-slate">
                  {tr("closedList", { list: closed.map((r) => r.number).join(", ") })}
                </p>
              )}
            </Panel>
          </div>
          <Section id="log" label={tr("log.label")} title={tr("log.title")}>
            <Panel>
              <AddRiskForm programId={program.id} />
            </Panel>
            {all.length > 0 && (
              <ul className="divide-y divide-hairline-soft overflow-hidden rounded-lg border border-hairline bg-surface">
                {all.map((r) => (
                  <RiskRow key={r.id} risk={r} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      );
    },
    getDb(),
  );
}
