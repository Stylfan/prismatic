import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { LedgerTable } from "@/components/forecast/ledger-table";
import { MilestoneForecast } from "@/components/forecast/milestone-forecast";
import { ProgramTabs } from "@/components/program/program-tabs";
import { PageHeader, Panel, Section } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { programTitle } from "@/lib/load";
import { buildForecastView } from "@/lib/forecast-view";
import { listEvents } from "@/services/events";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/** Fremdrift: what has been delivered, at what tempo, and when each milestone looks likely. */
export default async function ForecastPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program } = full;
      const t = await getTranslations("program");
      const tf = await getTranslations("forecast");
      const view = await buildForecastView(
        full,
        await listItems(db, program.id),
        await listQuarterRecords(db, program.id),
        await listEvents(db, program.id),
      );
      const stats = view.result.stats;
      const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");

      const tiles = [
        { label: tf("tiles.delivered"), value: fmt(view.result.delivered) },
        { label: tf("tiles.low"), value: stats ? fmt(stats.low) : "–" },
        { label: tf("tiles.avg"), value: stats ? fmt(stats.avg) : "–" },
        { label: tf("tiles.high"), value: stats ? fmt(stats.high) : "–" },
      ];

      return (
        <div className="flex flex-col gap-12">
          <PageHeader label={t("label")} title={program.name} lead={program.goal || undefined} />
          <ProgramTabs programId={program.id} active="forecast" />
          <Section
            id="forecast"
            number={1}
            label={tf("label")}
            title={tf("title")}
            lead={tf("lead")}
          >
            <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline">
              {tiles.map((tile) => (
                <div key={tile.label} className="flex flex-col gap-1 bg-surface p-4">
                  <dt className="text-[11px] font-bold tracking-[0.14em] text-slate uppercase">
                    {tile.label}
                  </dt>
                  <dd className="tabular text-2xl font-semibold">{tile.value}</dd>
                </div>
              ))}
            </dl>
            <Panel>
              <ForecastChart view={view} />
            </Panel>
          </Section>
          <Section
            id="milestone-forecast"
            number={2}
            label={tf("milestones.label")}
            title={tf("milestones.title")}
            lead={tf("milestones.lead")}
          >
            <MilestoneForecast view={view} />
          </Section>
          <Section
            id="ledger"
            number={3}
            label={tf("ledger.label")}
            title={tf("ledger.title")}
            lead={tf("ledger.lead")}
          >
            <LedgerTable programId={program.id} rows={view.rows} />
          </Section>
        </div>
      );
    },
    getDb(),
  );
}
