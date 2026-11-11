import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddItemForm } from "@/components/backlog/add-item-form";
import { BacklogList } from "@/components/backlog/backlog-list";
import { BacklogSummary } from "@/components/backlog/backlog-summary";
import { PageHeader } from "@/components/ui/layout";
import { requireUser } from "@/auth/session";
import { getDb, withUser } from "@/db/client";
import { milestoneComputedScope, milestoneDone } from "@/domain/backlog";
import { cumulativeScopes } from "@/domain/scope";
import { programTitle } from "@/lib/load";
import { buildBacklogView } from "@/lib/backlog-view";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** The backlog: its business goals and features, grouped by milestone. */
export default async function ProgramBacklogPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program, milestones } = full;
      const tb = await getTranslations("backlog");
      const rows = await listItems(db, program.id);
      const { views, options } = await buildBacklogView(full, rows);
      // Each milestone's own points and what is done of them, as on the overview.
      const scopes = cumulativeScopes(
        milestones.map((m) => ({
          id: m.id,
          seq: m.seq,
          scopeOverride: m.scopeOverride,
          computed: milestoneComputedScope(full.sizes, m.id, rows),
        })),
      );
      const progress = Object.fromEntries(
        milestones.map((m) => [
          m.id,
          {
            own: scopes.find((s) => s.id === m.id)?.own ?? 0,
            done: milestoneDone(full.sizes, m.id, rows),
          },
        ]),
      );

      return (
        <div className="flex flex-col gap-5">
          <PageHeader
            label={program.name}
            title={(await getTranslations("nav"))("backlog")}
            lead={tb("lead")}
          />
          <BacklogSummary items={views} />
          <AddItemForm programId={program.id} options={options} />
          <BacklogList
            items={views}
            options={options}
            milestones={milestones}
            progress={progress}
          />
        </div>
      );
    },
    getDb(),
  );
}
