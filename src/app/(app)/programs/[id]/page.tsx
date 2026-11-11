import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { MilestoneProgress } from "@/components/overview/milestone-progress";
import { RiskList } from "@/components/overview/risk-list";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import { buttonClass } from "@/components/ui/controls";
import { PageHeader, Panel, Stat } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { milestoneComputedScope, milestoneDone } from "@/domain/backlog";
import { recentTempo, TEMPO_QUARTERS } from "@/domain/forecast";
import { riskBand } from "@/domain/risk";
import { cumulativeScopes } from "@/domain/scope";
import { buildForecastView } from "@/lib/forecast-view";
import { programTitle } from "@/lib/load";
import { listEvents } from "@/services/events";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";
import { listRisks } from "@/services/risks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

/**
 * The programme's front page: the figures that matter, each milestone with
 * its own progress and, folded away, its forecast, and the risks by number.
 */
export default async function OverviewPage({ params }: Params) {
  const user = await requireUser();
  // Everything the page reads, it reads as this user: row-level security applies.
  return withUser(
    user.id,
    async (db) => {
      const full = await getProgram(db, user.id, (await params).id);
      if (!full) notFound();
      const { program } = full;
      const t = await getTranslations("overview");
      const tn = await getTranslations("nav");
      const items = await listItems(db, program.id);
      const risks = await listRisks(db, program.id);
      const forecast = await buildForecastView(
        full,
        items,
        await listQuarterRecords(db, program.id),
        await listEvents(db, program.id),
      );

      const base = `/programs/${program.id}`;
      const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
      const open = risks.filter((r) => r.status === "open");
      const high = open.filter((r) => riskBand(r.probability, r.impact) === "high");

      // Each milestone's own scope and what is done of it: its own goals only.
      const scopes = cumulativeScopes(
        full.milestones.map((m) => ({
          id: m.id,
          seq: m.seq,
          scopeOverride: m.scopeOverride,
          computed: milestoneComputedScope(full.sizes, m.id, items),
        })),
      );
      const progress = forecast.milestones.map((m) => ({
        ...m,
        own: scopes.find((s) => s.id === m.id)?.own ?? 0,
        done: milestoneDone(full.sizes, m.id, items),
      }));
      const total = scopes.at(-1)?.cumulative ?? 0;
      const delivered = forecast.result.delivered;
      const next = forecast.milestones.find((m) => !m.reached);
      const recent = recentTempo(forecast.rows);

      return (
        <div className="flex flex-col gap-6">
          <PageHeader
            label={program.name}
            title={tn("overview")}
            actions={
              <Link href={`${base}/report`} className={buttonClass("secondary", "sm")}>
                {t("openReport")}
              </Link>
            }
          />

          {/* The milestones on the left, the four figures two by two on the right. */}
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-ink">{t("milestones.title")}</h2>
                <Link href={`${base}/forecast`} className="text-[12px] text-slate hover:text-ink">
                  {t("toForecast")}
                </Link>
              </div>
              <MilestoneProgress milestones={progress} />
              {total > 0 && (
                <p className="flex justify-end border-t border-hairline pt-3 text-[13px] text-ink tabular">
                  <span>
                    <span className="font-semibold">
                      {t("milestones.total", { done: fmt(delivered), total: fmt(total) })}
                    </span>{" "}
                    <span className="text-slate">
                      {t("milestones.totalPct", { pct: Math.round((delivered / total) * 100) })}
                    </span>
                  </span>
                </p>
              )}
            </Panel>
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label={t("stats.delivered")}
                value={fmt(delivered)}
                note={total > 0 ? t("stats.ofTotal", { total: fmt(total) }) : undefined}
              />
              <Stat
                label={t("stats.tempo", { count: TEMPO_QUARTERS })}
                value={recent !== null ? fmt(recent) : "–"}
                note={recent !== null ? t("stats.tempoNote") : t("stats.noTempo")}
              />
              <Stat
                label={t("stats.next")}
                value={next ? next.title : "–"}
                note={
                  next
                    ? t("stats.nextWhen", {
                        code: next.code,
                        when: next.at.avg?.label ?? t("stats.beyond"),
                      })
                    : forecast.milestones.length === 0
                      ? t("stats.noMilestones")
                      : t("stats.allReached")
                }
              />
              <Stat
                label={t("stats.risks")}
                value={open.length}
                note={high.length > 0 ? t("stats.high", { count: high.length }) : t("stats.noHigh")}
                tone={high.length > 0 ? "danger" : "success"}
              />
            </div>
          </div>

          <Panel className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-ink">{t("risksTitle")}</h2>
              <Link href={`${base}/risks`} className="text-[12px] text-slate hover:text-ink">
                {t("toRisks")}
              </Link>
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
              <RiskMatrix risks={open} />
              <RiskList risks={open} />
            </div>
          </Panel>
        </div>
      );
    },
    getDb(),
  );
}
