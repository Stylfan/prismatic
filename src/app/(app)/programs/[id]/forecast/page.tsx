import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { LedgerTable } from "@/components/forecast/ledger-table";
import { MilestoneForecast } from "@/components/forecast/milestone-forecast";
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
      const tf = await getTranslations("forecast");
      const view = await buildForecastView(
        full,
        await listItems(db, program.id),
        await listQuarterRecords(db, program.id),
        await listEvents(db, program.id),
      );
      const stats = view.result.stats;
      const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");

      // Better than average first, as everywhere the tempi are listed.
      const tempoTiles = (["high", "avg", "low"] as const).map((tempo) => ({
        tempo,
        label: tf(`tiles.${tempo}`),
        value: stats ? fmt(stats[tempo]) : "–",
      }));

      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            label={program.name}
            title={(await getTranslations("nav"))("forecast")}
            lead={tf("lead")}
          />
          <dl className="flex flex-wrap divide-x divide-hairline rounded-lg border border-hairline bg-surface py-3">
            <div className="flex items-baseline gap-2 px-5">
              <dt className="text-[13px] text-slate">{tf("tiles.delivered")}</dt>
              <dd className="text-[17px] font-semibold text-ink tabular">
                {fmt(view.result.delivered)}
              </dd>
            </div>
            {tempoTiles.map((tile) => (
              <div key={tile.tempo} className="flex items-baseline gap-2 px-5">
                <dt className="flex items-center gap-1.5 text-[13px] text-slate">
                  <span
                    aria-hidden
                    className="size-2.5 self-center rounded-full"
                    style={{ background: `var(--color-tempo-${tile.tempo})` }}
                  />
                  {tile.label}
                </dt>
                <dd className="text-[17px] font-semibold text-ink tabular">{tile.value}</dd>
              </div>
            ))}
            <p className="ml-auto self-center px-5 text-[12px] text-slate">{tf("tiles.unit")}</p>
          </dl>
          <Panel>
            <ForecastChart view={view} />
          </Panel>
          <Section
            id="milestone-forecast"
            label={tf("milestones.label")}
            title={tf("milestones.title")}
          >
            <MilestoneForecast view={view} />
          </Section>
          <Section
            id="ledger"
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
