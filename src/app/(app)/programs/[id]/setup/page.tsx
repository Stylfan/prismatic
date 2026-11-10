import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProgramTabs } from "@/components/program/program-tabs";
import { MilestonesPanel } from "@/components/program/milestones-panel";
import { SettingsPanel } from "@/components/program/settings-panel";
import { SizesPanel } from "@/components/program/sizes-panel";
import { PageHeader, Section } from "@/components/ui/layout";
import { requireUser } from "@/auth/session";
import { getDb } from "@/db/client";
import { milestoneComputedScope } from "@/domain/backlog";
import { cumulativeScopes } from "@/domain/scope";
import { todayInCopenhagen } from "@/lib/dates";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await requireUser();
  const full = getProgram(getDb(), user.id, (await params).id);
  return { title: full?.program.name };
}

/** One programme's set-up: its settings and periods, its milestones and its sizes. */
export default async function ProgramSetupPage({ params }: Params) {
  const user = await requireUser();
  const db = getDb();
  const full = getProgram(db, user.id, (await params).id);
  if (!full) notFound();
  const rows = listItems(db, full.program.id);
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
    <div className="flex flex-col gap-14">
      <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
      <ProgramTabs programId={program.id} active="setup" />
      <Section
        id="settings"
        number={1}
        label={t("settingsLabel")}
        title={t("settingsTitle")}
        lead={t("settingsLead")}
      >
        <SettingsPanel
          programId={program.id}
          today={todayInCopenhagen()}
          initial={{
            name: program.name,
            goal: program.goal,
            periodModel: program.periodModel,
            startDate: program.startDate,
            quarterHorizon: program.quarterHorizon,
            costPerQuarter: program.costPerQuarter,
            deviationPct: program.deviationPct,
          }}
        />
      </Section>
      <Section id="milestones" number={2} label={tm("label")} title={tm("title")} lead={tm("lead")}>
        <MilestonesPanel
          programId={program.id}
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
      <Section id="sizes" number={3} label={ts("label")} title={ts("title")} lead={ts("lead")}>
        <SizesPanel programId={program.id} sizes={sizes} />
      </Section>
    </div>
  );
}
