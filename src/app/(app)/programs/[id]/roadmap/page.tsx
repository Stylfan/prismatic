import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/auth/session";
import { DeliveredList } from "@/components/roadmap/delivered-list";
import { EventForm } from "@/components/roadmap/event-form";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { buildForecastView } from "@/lib/forecast-view";
import { buildRoadmapView } from "@/lib/roadmap-view";
import { listEvents } from "@/services/events";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** The roadmap: where the work sits in time, its milestones, events and what has been delivered. */
export default async function RoadmapPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program } = full;
      const tr = await getTranslations("roadmap");
      const items = await listItems(db, program.id);
      const events = await listEvents(db, program.id);
      const records = await listQuarterRecords(db, program.id);
      const forecast = await buildForecastView(full, items, records, events);
      const capacityPct = (q: number) =>
        records.find((r) => r.quarterIndex === q)?.capacityPct ?? 100;
      const view = await buildRoadmapView(full, items, events, {
        avgVelocity: forecast.result.stats?.avg ?? null,
        capacityPct,
      });

      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            label={program.name}
            title={(await getTranslations("nav"))("roadmap")}
            lead={tr("lead")}
          />
          <RoadmapBoard
            programId={program.id}
            columns={view.columns}
            cards={view.cards}
            milestones={view.milestones}
            options={view.options}
            eventsPanel={
              <Section
                id="events"
                label={tr("events.label")}
                title={tr("events.heading")}
                hint={tr("events.lead")}
              >
                <Panel className="flex-1">
                  <EventForm programId={program.id} quarters={view.eventQuarters} />
                </Panel>
              </Section>
            }
          />
          <details id="delivered" className="group flex flex-col gap-3">
            <summary className="flex w-max cursor-pointer list-none items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-1.5 text-[14px] font-semibold text-ink hover:bg-sand [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-4 transition-transform group-open:rotate-90"
                aria-hidden
              />
              {tr("delivered.toggle")}
            </summary>
            <div className="pt-3">
              <DeliveredList groups={view.delivered} />
            </div>
          </details>
        </div>
      );
    },
    getDb(),
  );
}
