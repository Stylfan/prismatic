import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ProgramTabs } from "@/components/program/program-tabs";
import { DeliveredList } from "@/components/roadmap/delivered-list";
import { EventForm } from "@/components/roadmap/event-form";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { buildForecastView } from "@/lib/forecast-view";
import { buildRoadmapView } from "@/lib/roadmap-view";
import { listEvents } from "@/services/events";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const user = await requireUser();
  const full = getProgram(getDb(), user.id, (await params).id);
  return { title: full?.program.name };
}

/** The roadmap: where the work sits in time, its milestones, events and what has been delivered. */
export default async function RoadmapPage({ params }: Params) {
  const user = await requireUser();
  const db = getDb();
  const full = getProgram(db, user.id, (await params).id);
  if (!full) notFound();
  const { program } = full;
  const t = await getTranslations("program");
  const tr = await getTranslations("roadmap");
  const items = listItems(db, program.id);
  const events = listEvents(db, program.id);
  const records = listQuarterRecords(db, program.id);
  const forecast = await buildForecastView(full, items, records, events);
  const capacityPct = (q: number) => records.find((r) => r.quarterIndex === q)?.capacityPct ?? 100;
  const view = await buildRoadmapView(full, items, events, {
    avgVelocity: forecast.result.stats?.avg ?? null,
    capacityPct,
  });

  return (
    <div className="flex flex-col gap-12">
      <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
      <ProgramTabs programId={program.id} active="roadmap" />
      <Section id="roadmap" number={1} label={tr("label")} title={tr("title")} lead={tr("lead")}>
        <RoadmapBoard columns={view.columns} cards={view.cards} milestones={view.milestones} />
      </Section>
      <Section
        id="events"
        number={2}
        label={tr("events.label")}
        title={tr("events.heading")}
        lead={tr("events.lead")}
      >
        <Panel>
          <EventForm programId={program.id} quarters={view.eventQuarters} />
        </Panel>
      </Section>
      <Section
        id="delivered"
        number={3}
        label={tr("delivered.label")}
        title={tr("delivered.title")}
        lead={tr("delivered.lead")}
      >
        <DeliveredList groups={view.delivered} />
      </Section>
    </div>
  );
}
