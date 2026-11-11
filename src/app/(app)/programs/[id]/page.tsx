import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddItemForm } from "@/components/backlog/add-item-form";
import { BacklogList } from "@/components/backlog/backlog-list";
import { BacklogSummary } from "@/components/backlog/backlog-summary";
import { ProgramTabs } from "@/components/program/program-tabs";
import { PageHeader, Section } from "@/components/ui/layout";
import { requireUser } from "@/auth/session";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { buildBacklogView } from "@/lib/backlog-view";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** A programme's backlog: its business goals and features, grouped by milestone. */
export default async function ProgramBacklogPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program, milestones } = full;
      const t = await getTranslations("program");
      const tb = await getTranslations("backlog");
      const { views, options } = await buildBacklogView(full, await listItems(db, program.id));

      return (
        <div className="flex flex-col gap-12">
          <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
          <ProgramTabs programId={program.id} active="backlog" />
          <Section id="backlog" label={tb("label")} title={tb("title")} lead={tb("lead")}>
            <BacklogSummary items={views} />
            <AddItemForm programId={program.id} options={options} />
            <BacklogList items={views} options={options} milestones={milestones} />
          </Section>
        </div>
      );
    },
    getDb(),
  );
}
