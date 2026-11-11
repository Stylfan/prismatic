import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BacklogBoard, type BacklogGroup } from "@/components/backlog/backlog-board";
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

/** The backlog: a tree of business goals and features under their milestones. */
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
      const tm = await getTranslations("milestones");
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
      const goals = views.filter((v) => v.kind === "goal");
      const groups: BacklogGroup[] = milestones.map((m) => ({
        key: m.id,
        label: tb("groups.milestone", { code: tm("code", { seq: m.seq }), title: m.title }),
        progress: {
          own: scopes.find((s) => s.id === m.id)?.own ?? 0,
          done: milestoneDone(full.sizes, m.id, rows),
        },
        goalIds: goals.filter((g) => g.milestoneId === m.id).map((g) => g.id),
      }));
      const orphans = goals.filter((g) => g.milestoneId === null);
      if (orphans.length > 0) {
        groups.push({
          key: "none",
          label: tb("groups.noMilestone"),
          goalIds: orphans.map((g) => g.id),
        });
      }

      return (
        <div className="flex flex-col gap-5">
          <PageHeader
            label={program.name}
            title={(await getTranslations("nav"))("backlog")}
            lead={tb("lead")}
          />
          <BacklogBoard programId={program.id} items={views} groups={groups} options={options} />
        </div>
      );
    },
    getDb(),
  );
}
