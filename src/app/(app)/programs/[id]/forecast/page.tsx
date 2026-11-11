import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { LedgerTable } from "@/components/forecast/ledger-table";
import { MilestoneForecast } from "@/components/forecast/milestone-forecast";
import { PageHeader, Panel, Section, Stat } from "@/components/ui/layout";
import { TEMPI } from "@/domain/forecast";
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

      const next = view.milestones.find((m) => !m.reached);
      const tempoTiles = TEMPI.map((tempo) => ({
        tempo,
        label: tf(`tiles.${tempo}`),
        value: stats ? fmt(stats[tempo]) : "–",
        note: next ? `${next.code}: ${next.at[tempo]?.label ?? tf("milestones.beyond")}` : null,
      }));

      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            label={program.name}
            title={(await getTranslations("nav"))("forecast")}
            lead={tf("lead")}
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={tf("tiles.delivered")} value={fmt(view.result.delivered)} />
            {tempoTiles.map((tile) => (
              <div
                key={tile.tempo}
                className="flex min-w-0 flex-col gap-1 rounded-lg border border-hairline border-t-[3px] bg-surface px-4 py-3"
                style={{ borderTopColor: `var(--color-tempo-${tile.tempo})` }}
              >
                <span className="text-[12px] text-slate">{tile.label}</span>
                <span className="text-xl leading-tight font-semibold text-ink tabular">
                  {tile.value}
                </span>
                {tile.note && <span className="text-[12px] text-slate">{tile.note}</span>}
              </div>
            ))}
          </div>
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
