import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ColumnsPreview } from "@/components/program/columns-preview";
import { MilestonesPanel } from "@/components/program/milestones-panel";
import { SettingsPanel } from "@/components/program/settings-panel";
import { SizesPanel } from "@/components/program/sizes-panel";
import { PageHeader, Section } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { roadmapColumns } from "@/domain/periods";
import { cumulativeScopes } from "@/domain/scope";
import { todayInCopenhagen } from "@/lib/dates";
import { getProgram } from "@/services/programs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const full = getProgram(getDb(), (await params).id);
  return { title: full?.program.name };
}

/** One programme's set-up: the frame its roadmap sits in, its milestones, sizes and settings. */
export default async function ProgramPage({ params }: Params) {
  const full = getProgram(getDb(), (await params).id);
  if (!full) notFound();
  const { program, sizes, milestones } = full;
  const t = await getTranslations("program");
  const tm = await getTranslations("milestones");
  const ts = await getTranslations("sizes");

  const columns = roadmapColumns(
    { model: program.periodModel, startDate: program.startDate },
    todayInCopenhagen(),
    program.quarterHorizon,
  );
  // Business goals arrive in the next step; until then a milestone's own scope is its override.
  const scopes = cumulativeScopes(
    milestones.map((m) => ({ id: m.id, seq: m.seq, scopeOverride: m.scopeOverride, computed: 0 })),
  );

  return (
    <div className="flex flex-col gap-14">
      <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
      <Section
        id="columns"
        number={1}
        label={t("columnsLabel")}
        title={t("columnsTitle")}
        lead={t("columnsLead")}
      >
        <ColumnsPreview columns={columns} />
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
            cumulative: scopes.find((s) => s.id === m.id)?.cumulative ?? 0,
          }))}
        />
      </Section>
      <Section id="sizes" number={3} label={ts("label")} title={ts("title")} lead={ts("lead")}>
        <SizesPanel programId={program.id} sizes={sizes} />
      </Section>
      <Section
        id="settings"
        number={4}
        label={t("settingsLabel")}
        title={t("settingsTitle")}
        lead={t("settingsLead")}
      >
        <SettingsPanel
          programId={program.id}
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
    </div>
  );
}
