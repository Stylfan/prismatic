import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddMilestone } from "@/components/program/add-milestone";
import { MilestonesPanel } from "@/components/program/milestones-panel";
import { SettingsPanel } from "@/components/program/settings-panel";
import { SizesPanel } from "@/components/program/sizes-panel";
import { PageHeader, Section } from "@/components/ui/layout";
import { requireUser } from "@/auth/session";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { milestoneComputedScope } from "@/domain/backlog";
import { cumulativeScopes } from "@/domain/scope";
import { todayInCopenhagen } from "@/lib/dates";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** One programme's set-up: its settings and periods, its milestones and its sizes. */
export default async function ProgramSetupPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const rows = await listItems(db, full.program.id);
      const { program, sizes, milestones } = full;
      const t = await getTranslations("program");
      const tm = await getTranslations("milestones");
      const ts = await getTranslations("sizes");

      const computed = new Map(
        milestones.map((m) => [m.id, milestoneComputedScope(sizes, m.id, rows)]),
      );
      const scopes = cumulativeScopes(
        milestones.map((m) => ({
          id: m.id,
          seq: m.seq,
          scopeOverride: m.scopeOverride,
          computed: computed.get(m.id) ?? 0,
        })),
      );

      return (
        <div className="flex flex-col gap-6">
          <PageHeader label={program.name} title={(await getTranslations("nav"))("setup")} />
          <div className="flex max-w-5xl flex-col gap-8">
            <nav aria-label={t("settingsLabel")} className="-mb-2 flex gap-1 text-[13px]">
              {[
                ["#settings", t("settingsLabel")],
                ["#milestones", tm("label")],
                ["#sizes", ts("label")],
              ].map(([href, text]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-md px-3 py-1.5 text-slate hover:bg-sand hover:text-ink"
                >
                  {text}
                </a>
              ))}
            </nav>
            <div id="settings">
              <SettingsPanel
                programId={program.id}
                today={todayInCopenhagen()}
                initial={{
                  name: program.name,
                  goal: program.goal,
                  periodModel: program.periodModel,
                  startDate: program.startDate,
                  roadmapYears: program.roadmapYears,
                  costPerQuarter: program.costPerQuarter,
                  deviationPct: program.deviationPct,
                }}
              />
            </div>
            <Section
              id="milestones"
              label={tm("label")}
              title={tm("title")}
              hint={tm("lead")}
              actions={<AddMilestone programId={program.id} />}
            >
              <MilestonesPanel
                milestones={milestones.map((m) => ({
                  id: m.id,
                  seq: m.seq,
                  title: m.title,
                  description: m.description,
                  scopeOverride: m.scopeOverride,
                  done: m.doneAt !== null,
                  computed: computed.get(m.id) ?? 0,
                  cumulative: scopes.find((s) => s.id === m.id)?.cumulative ?? 0,
                }))}
              />
            </Section>
            <Section id="sizes" label={ts("label")} title={ts("title")} hint={ts("lead")}>
              <SizesPanel programId={program.id} sizes={sizes} />
            </Section>
          </div>
        </div>
      );
    },
    getDb(),
  );
}
