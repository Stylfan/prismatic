import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { AttentionList, type Attention } from "@/components/overview/attention-list";
import { MilestoneProgress } from "@/components/overview/milestone-progress";
import { RiskMatrix } from "@/components/risks/risk-matrix";
import { buttonClass } from "@/components/ui/controls";
import { PageHeader, Panel, Stat } from "@/components/ui/layout";
import { getDb, withUser } from "@/db/client";
import { programHealth } from "@/domain/health";
import { byScore, riskBand } from "@/domain/risk";
import { cn } from "@/lib/cn";
import { buildForecastView } from "@/lib/forecast-view";
import { programTitle } from "@/lib/load";
import { buildRoadmapView } from "@/lib/roadmap-view";
import { listEvents } from "@/services/events";
import { listItems } from "@/services/items";
import { getProgram } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";
import { listCases } from "@/services/report-content";
import { listRisks } from "@/services/risks";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: await programTitle((await params).id) };
}

const HEALTH_STYLE = {
  good: "bg-success-soft text-success",
  watch: "bg-warning-soft text-warning",
  bad: "bg-danger-soft text-danger",
} as const;

/**
 * The programme's front page, the answer before the detail: its colour and
 * why, the figures that matter, each milestone and when it looks likely,
 * the risks, and what needs a hand this week.
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
      const [items, events, records, risks, cases] = [
        await listItems(db, program.id),
        await listEvents(db, program.id),
        await listQuarterRecords(db, program.id),
        await listRisks(db, program.id),
        await listCases(db, program.id),
      ];
      const forecast = await buildForecastView(full, items, records, events);
      const stats = forecast.result.stats;
      const roadmap = await buildRoadmapView(full, items, events, {
        avgVelocity: stats?.avg ?? null,
        capacityPct: (q) => records.find((r) => r.quarterIndex === q)?.capacityPct ?? 100,
      });

      const base = `/programs/${program.id}`;
      const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
      const open = risks.filter((r) => r.status === "open");
      const high = open.filter((r) => riskBand(r.probability, r.impact) === "high");
      const overloaded = roadmap.columns.filter((c) => c.pct !== null && c.pct > 100);
      const warnings = roadmap.cards.reduce((n, c) => n + c.warnings.length, 0);
      const slipping = roadmap.milestones.filter((m) => m.later.length > 0);
      const openCases = cases.filter((c) => c.status === "open");
      const health = programHealth({
        overloaded: overloaded.length,
        highRisks: high.length,
        warnings,
        slipping: slipping.length,
      });

      const attention: Attention[] = [
        ...byScore(high).map((r) => ({
          kind: "highRisk" as const,
          text: t("attention.highRisk", { number: r.number, title: r.title }),
          href: `${base}/risks`,
        })),
        ...overloaded.map((c) => ({
          kind: "overloaded" as const,
          text: t("attention.overloaded", { period: c.label, pct: c.pct ?? 0 }),
          href: `${base}/roadmap`,
        })),
        ...slipping.map((m) => ({
          kind: "slipping" as const,
          text: t("attention.slipping", { code: m.code, count: m.later.length }),
          href: `${base}/roadmap`,
        })),
        ...(warnings > 0
          ? [
              {
                kind: "warnings" as const,
                text: t("attention.warnings", { count: warnings }),
                href: `${base}/backlog`,
              },
            ]
          : []),
        ...(openCases.length > 0
          ? [
              {
                kind: "cases" as const,
                text: t("attention.cases", { count: openCases.length }),
                href: `${base}/report`,
              },
            ]
          : []),
      ];

      const total = forecast.milestones.at(-1)?.threshold ?? 0;
      const next = forecast.milestones.find((m) => !m.reached);

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

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium",
                HEALTH_STYLE[health],
              )}
            >
              <span aria-hidden className="size-2 rounded-full bg-current" />
              {t(`health.${health}`)}
            </span>
            {program.goal && <span className="text-[13px] text-slate">{program.goal}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label={t("stats.delivered")}
              value={fmt(forecast.result.delivered)}
              note={total > 0 ? t("stats.ofTotal", { total: fmt(total) }) : undefined}
            />
            <Stat
              label={t("stats.tempo")}
              value={stats ? fmt(stats.avg) : "–"}
              note={
                stats
                  ? t("stats.tempoRange", { low: fmt(stats.low), high: fmt(stats.high) })
                  : t("stats.noTempo")
              }
            />
            <Stat
              label={t("stats.next")}
              value={next ? next.code : "–"}
              note={
                next
                  ? (next.at.avg?.label ?? t("stats.beyond"))
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Panel className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-ink">{t("milestones.title")}</h2>
                <Link href={`${base}/forecast`} className="text-[12px] text-slate hover:text-ink">
                  {t("toForecast")}
                </Link>
              </div>
              <MilestoneProgress
                milestones={forecast.milestones}
                delivered={forecast.result.delivered}
              />
            </Panel>
            <div className="flex flex-col gap-4">
              <Panel className="flex flex-col gap-2">
                <h2 className="text-[14px] font-semibold text-ink">{t("attention.title")}</h2>
                <AttentionList items={attention} />
              </Panel>
              <Panel className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-ink">{t("risksTitle")}</h2>
                  <Link href={`${base}/risks`} className="text-[12px] text-slate hover:text-ink">
                    {t("toRisks")}
                  </Link>
                </div>
                <div className="max-w-[300px]">
                  <RiskMatrix risks={open} />
                </div>
              </Panel>
            </div>
          </div>
        </div>
      );
    },
    getDb(),
  );
}
