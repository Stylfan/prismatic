import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/auth/session";
import { AddRiskForm } from "@/components/risks/add-risk-form";
import { RiskList } from "@/components/overview/risk-list";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import { RiskRow } from "@/components/risks/risk-row";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
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
              <h2 className="text-[14px] font-semibold text-ink">{tr("openList")}</h2>
              <RiskList risks={open} />
              {closed.length > 0 && (
                <details className="group mt-auto border-t border-hairline-soft pt-2">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-slate hover:text-ink [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      className="size-3.5 transition-transform group-open:rotate-90"
                      aria-hidden
                    />
                    {tr("closedList", { count: closed.length })}
                  </summary>
                  <div className="pt-1">
                    <RiskList risks={closed} closed />
                  </div>
                </details>
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
